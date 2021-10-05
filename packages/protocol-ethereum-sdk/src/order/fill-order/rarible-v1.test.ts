import { Configuration, NftOwnershipControllerApi, OrderControllerApi } from "@rarible/protocol-api-client"
import { toAddress, toBigNumber, toWord } from "@rarible/types"
import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { CONFIGS } from "../../config"
import { retry } from "../../common/retry"
import { simpleSend } from "../../common/send-transaction"
import { getApiConfig } from "../../config/api-config"
import { signOrder } from "../sign-order"
import { deployTestErc721 } from "../contracts/test/test-erc721"
import { SimpleLegacyOrder, SimpleOrder } from "../types"
import { RaribleV1OrderHandler } from "./rarible-v1"
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

	const configuration = new Configuration(getApiConfig("e2e"))
	const orderApi = new OrderControllerApi(configuration)
	const ownershipApi = new NftOwnershipControllerApi(configuration)
	const v1Handler = new RaribleV1OrderHandler(
		ethereum2, orderApi, simpleSend, CONFIGS.e2e
	)
	const filler = new OrderFiller(ethereum2, v1Handler, null as any, null as any)

	const seller = toAddress(wallet1.getAddressString())
	const buyer = toAddress(wallet2.getAddressString())

	const it = awaitAll({
		testErc721: deployTestErc721(web31, "Test", "TST"),
	})

	const sign = signOrder.bind(null, ethereum1, { chainId: 17, exchange: CONFIGS.e2e.exchange })

	test("", async () => {
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

		await it.testErc721.methods.setApprovalForAll(CONFIGS.e2e.transferProxies.nft, true).send({ from: seller })

		const signedOrder: SimpleLegacyOrder = { ...order, signature: await sign(order) }
		const ab = await filler.fill({ order: signedOrder, amount: 1, originFee: 100 })
		await ab.build().runAll()

		await retry(10, async () => {
			const ownership = await ownershipApi.getNftOwnershipById({
				ownershipId: `${it.testErc721.options.address}:${tokenId}:${buyer}`,
			})
			expect(ownership.value).toBe("1")
		})
	}, 30000)
})
