import { Configuration, NftOwnershipControllerApi } from "@rarible/ethereum-api-client"
import { toAddress, toBigNumber, toWord } from "@rarible/types"
import { awaitAll, createE2eProvider, deployTestErc721 } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { getEthereumConfig } from "../../config"
import { retry } from "../../common/retry"
import { getSimpleSendWithInjects } from "../../common/send-transaction"
import { getApiConfig } from "../../config/api-config"
import { signOrder } from "../sign-order"
import type { SimpleLegacyOrder, SimpleOrder } from "../types"
import { createEthereumApis } from "../../common/apis"
import { checkChainId } from "../check-chain-id"
import { OrderFiller } from "./"

describe("test exchange v1 order", () => {
	const { provider: provider1, wallet: wallet1 } = createE2eProvider()
	const { provider: provider2, wallet: wallet2 } = createE2eProvider(
		"ded057615d97f0f1c751ea2795bc4b03bbf44844c13ab4f5e6fd976506c276b9"
	)
	const web31 = new Web3(provider1)
	const web32 = new Web3(provider2)
	const ethereum1 = new Web3Ethereum({ web3: web31 })
	const ethereum2 = new Web3Ethereum({ web3: web32 })

	const e2eConfig = getEthereumConfig("e2e")
	const configuration = new Configuration(getApiConfig("e2e"))
	const ownershipApi = new NftOwnershipControllerApi(configuration)

	const apis = createEthereumApis("e2e")
	const config = getEthereumConfig("e2e")

	const getBaseOrderFee = async () => 0
	const checkWalletChainId2 = checkChainId.bind(null, ethereum2, config)
	const send2 = getSimpleSendWithInjects().bind(null, checkWalletChainId2)

	const filler = new OrderFiller(ethereum2, send2, e2eConfig, apis, getBaseOrderFee)

	const seller = toAddress(wallet1.getAddressString())
	const buyer = toAddress(wallet2.getAddressString())

	const it = awaitAll({
		testErc721: deployTestErc721(web31, "Test", "TST"),
	})

	const sign = signOrder.bind(null, ethereum1, {
		chainId: 17,
		exchange: e2eConfig.exchange,
	})

	test("simple test v1", async () => {
		const tokenId = toBigNumber("1")
		await it.testErc721.methods.mint(seller, tokenId, "url").send({ from: seller })

		let order: SimpleOrder = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber(tokenId),
				},
				value: toBigNumber("1"),
			},
			maker: seller,
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("100000"),
			},
			salt: toWord("0x000000000000000000000000000000000000000000000000000000000000000a"),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 3,
			},
		}

		await it.testErc721.methods
			.setApprovalForAll(e2eConfig.transferProxies.nft, true)
			.send({from: seller })

		const signedOrder: SimpleLegacyOrder = { ...order, signature: await sign(order) }
		await filler.buy({ order: signedOrder, amount: 1, originFee: 100 })

		const ownership = await retry(10, 4000, async () => {
			const ownership = await ownershipApi.getNftOwnershipById({
				ownershipId: `${it.testErc721.options.address}:${tokenId}:${buyer}`,
			})
			if (ownership.value.toString() !== "1") {
				throw new Error("Ownership value must be '1'")
			}
			return ownership
		})
		expect(ownership.value).toBe("1")
	})

	test("get transaction data", async () => {
		const tokenId = toBigNumber("1")

		let order: SimpleOrder = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber(tokenId),
				},
				value: toBigNumber("1"),
			},
			maker: seller,
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("100000"),
			},
			salt: toWord("0x000000000000000000000000000000000000000000000000000000000000000a"),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 3,
			},
		}

		const signedOrder: SimpleLegacyOrder = { ...order, signature: await sign(order) }
		await filler.getTransactionData({ order: signedOrder, amount: 1, originFee: 100 })
	})
})
