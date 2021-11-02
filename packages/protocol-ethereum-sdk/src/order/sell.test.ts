import { toAddress, toBigNumber, toBinary } from "@rarible/types"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
	OrderControllerApi,
	OrderForm,
} from "@rarible/ethereum-api-client"
import { createE2eProvider, createE2eWallet } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils"
import { E2E_CONFIG } from "../config/e2e"
import { getApiConfig } from "../config/api-config"
import { ERC721RequestV3, mint as mintTemplate } from "../nft/mint"
import { createTestProviders } from "../common/create-test-providers"
import { send as sendTemplate } from "../common/send-transaction"
import { signNft as signNftTemplate } from "../nft/sign-nft"
import { createErc721V3Collection } from "../common/mint"
import { delay } from "../common/retry"
import { OrderSell } from "./sell"
import { signOrder as signOrderTemplate } from "./sign-order"
import { RaribleV2OrderHandler } from "./fill-order/rarible-v2"
import { OrderFiller } from "./fill-order"
import { UpsertOrder } from "./upsert-order"
import { checkAssetType as checkAssetTypeTemplate } from "./check-asset-type"
import { OpenSeaOrderHandler } from "./fill-order/open-sea"
import { RaribleV1OrderHandler } from "./fill-order/rarible-v1"
import { TEST_ORDER_TEMPLATE } from "./test/order"

const { provider, wallet } = createE2eProvider(
	"d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469"
)
const { providers } = createTestProviders(provider, wallet)

describe.each(providers)("sell", (ethereum) => {
	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const orderApi = new OrderControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const v2Handler = new RaribleV2OrderHandler(ethereum, send, E2E_CONFIG)
	const signOrder = signOrderTemplate.bind(null, ethereum, E2E_CONFIG)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)
	const signNft = signNftTemplate.bind(null, ethereum, E2E_CONFIG.chainId)
	const mint = mintTemplate
		.bind(null, ethereum, send, signNft, nftCollectionApi)
		.bind(null, nftLazyMintApi)
	const v1Handler = new RaribleV1OrderHandler(
		ethereum,
		orderApi,
		send,
		E2E_CONFIG
	)
	const openSeaHandler = new OpenSeaOrderHandler(ethereum, send, E2E_CONFIG)
	const orderService = new OrderFiller(
		ethereum,
		v1Handler,
		v2Handler,
		openSeaHandler,
		null as any,
	)
	const upserter = new UpsertOrder(
		orderService,
		(x) => Promise.resolve(x),
		() => Promise.resolve(undefined),
		signOrder,
		orderApi,
		ethereum
	)
	const orderSell = new OrderSell(upserter, checkAssetType)
	const e2eErc721V3ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const treasury = createE2eWallet()
	const treasuryAddress = toAddress(treasury.getAddressString())

	test("create and update of v2 works", async () => {
		const makerAddress = toAddress(wallet.getAddressString())
		const minted = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "uri",
			creators: [{
				account: makerAddress,
				value: 10000,
			}],
			royalties: [],
			lazy: false,
		} as ERC721RequestV3)

		const order = await orderSell.sell({
			maker: toAddress(wallet.getAddressString()),
			makeAssetType: {
				assetClass: "ERC721",
				contract: minted.contract,
				tokenId: minted.tokenId,
			},
			price: toBn("2"),
			takeAssetType: {
				assetClass: "ETH",
			},
			amount: 1,
			payouts: [],
			originFees: [{
				account: treasuryAddress,
				value: 100,
			}],
		})

		expect(order.hash).toBeTruthy()

		await delay(500)
		const updatedOrder = await orderSell.update({
			orderHash: order.hash,
			price: toBigNumber("1"),
		})
		expect(updatedOrder.take.value.toString()).toBe("1")
	})

	test("create and update of v1 works", async () => {
		const makerAddress = toAddress(wallet.getAddressString())
		const minted = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "uri",
			creators: [{
				account: makerAddress,
				value: 10000,
			}],
			royalties: [],
			lazy: false,
		} as ERC721RequestV3)

		const form: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			maker: makerAddress,
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: minted.contract,
					tokenId: minted.tokenId,
				},
				value: toBigNumber("1"),
			},
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("2"),
			},
			salt: toBigNumber("10"),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 250,
			},
			signature: toBinary("0x"),
		}
		const order = await upserter.upsert({ order: form })

		await delay(500)
		const updatedOrder = await orderSell.update({
			orderHash: order.hash,
			price: toBigNumber("1"),
		})
		expect(updatedOrder.take.value.toString()).toBe("1")
	})
})
