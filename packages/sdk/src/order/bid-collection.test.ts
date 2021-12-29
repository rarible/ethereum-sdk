import { toAddress } from "@rarible/types"
import {
	Configuration,
	NftCollectionControllerApi,
	OrderControllerApi,
} from "@rarible/ethereum-api-client"
import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toBigNumber } from "@rarible/types"
import { getEthereumConfig } from "../config"
import { getApiConfig } from "../config/api-config"
import { sentTx, simpleSend } from "../common/send-transaction"
import { delay } from "../common/retry"
import { createEthereumApis } from "../common/apis"
import { OrderBid } from "./bid"
import { signOrder as signOrderTemplate } from "./sign-order"
import { OrderFiller } from "./fill-order"
import { UpsertOrder } from "./upsert-order"
import { checkAssetType as checkAssetTypeTemplate } from "./check-asset-type"
import { checkChainId } from "./check-chain-id"
import type { SimpleRaribleV2Order } from "./types"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { approve as approveTemplate } from "./approve"

describe("bid", () => {
	const { provider: provider1 } = createE2eProvider()
	const web31 = new Web3(provider1)
	const ethereum1 = new Web3Ethereum({ web3: web31 })

	const { provider: provider2 } = createE2eProvider()
	const web32 = new Web3(provider2)
	const ethereum2 = new Web3Ethereum({ web3: web32 })

	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const orderApi = new OrderControllerApi(configuration)
	const config = getEthereumConfig("e2e")
	const signOrder = signOrderTemplate.bind(null, ethereum2, config)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)
	const apis = createEthereumApis("e2e")
	const checkWalletChainId = checkChainId.bind(null, ethereum2, config)

	const orderService = new OrderFiller(ethereum2, simpleSend, config, apis)
	const approve2 = approveTemplate.bind(null, ethereum2, simpleSend, config.transferProxies)

	const upserter = new UpsertOrder(
		orderService,
		(x) => Promise.resolve(x),
		approve2,
		signOrder,
		orderApi,
		ethereum2,
		checkWalletChainId,
	)
	const orderBid = new OrderBid(upserter, checkAssetType, checkWalletChainId)

	const it = awaitAll({
		testErc20: deployTestErc20(web32, "Test1", "TST1"),
		testErc721: deployTestErc721(web31, "Test", "TST"),
	})

	const filler1 = new OrderFiller(ethereum1, simpleSend, config, apis)

	test("create bid for collection", async () => {
		const ownerCollectionAddress = toAddress(await ethereum1.getFrom())
		const bidderAddress = toAddress(await ethereum2.getFrom())

		await sentTx(
			it.testErc20.methods.mint(bidderAddress, "100000000000000"), {
			  from: bidderAddress,
			  gas: 200000,
		  }
		)

		await sentTx(it.testErc721.methods.mint(ownerCollectionAddress, 0, "0x"), { from: ownerCollectionAddress })
		await sentTx(it.testErc721.methods.mint(ownerCollectionAddress, 1, "0x"), { from: ownerCollectionAddress })

		await delay(5000)

		const erc20Contract = toAddress(it.testErc20.options.address)

		const order = await orderBid.bid({
			maker: bidderAddress,
			makeAssetType: {
				assetClass: "ERC20",
				contract: erc20Contract,
			},
			takeAssetType: {
				assetClass: "COLLECTION",
				contract: toAddress(it.testErc721.options.address),
			},
			price: toBn("12"),
			amount: 1,
			payouts: [],
			originFees: [],
		}) as SimpleRaribleV2Order

		const acceptBidTx = await filler1.acceptBid({
			order,
			amount: 1,
			originFees: [],
			assetType: {
				assetClass: "ERC721",
				contract: toAddress(it.testErc721.options.address),
				tokenId: toBigNumber("1"),
			},
		})
		await acceptBidTx.wait()
	})

})
