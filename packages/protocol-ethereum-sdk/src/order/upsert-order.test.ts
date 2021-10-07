import { toAddress, toBigNumber } from "@rarible/types"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { createE2eProvider, createE2eWallet } from "@rarible/ethereum-sdk-test-common"
import { E2E_CONFIG } from "../config/e2e"
import { getApiConfig } from "../config/api-config"
import { createTestProviders } from "../common/create-test-providers"
import { send as sendTemplate } from "../common/send-transaction"
import { ERC721RequestV3, mint as mintTemplate, MintRequest } from "../nft/mint"
import { createErc721V3Collection } from "../common/mint"
import { signNft as signNftTemplate } from "../nft/sign-nft"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { UpsertOrder } from "./upsert-order"
import { signOrder as signOrderTemplate } from "./sign-order"
import { RaribleV2OrderHandler } from "./fill-order/rarible-v2"
import { OrderFiller } from "./fill-order"
import { RaribleV1OrderHandler } from "./fill-order/rarible-v1"
import { OpenSeaOrderHandler } from "./fill-order/open-sea"

const { provider, wallet } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
const { providers } = createTestProviders(provider, wallet)
const makerAddress = toAddress(wallet.getAddressString())

const configuration = new Configuration(getApiConfig("e2e"))
const nftCollectionApi = new NftCollectionControllerApi(configuration)
const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
const nftItemApi = new NftItemControllerApi(configuration)
const gatewayApi = new GatewayControllerApi(configuration)
const send = sendTemplate.bind(null, gatewayApi)
const checkLazyOrder = (order: OrderForm) => Promise.resolve(order)
const approve = () => Promise.resolve(undefined)
const orderApi = new OrderControllerApi(configuration)

describe.each(providers)("upsertOrder", (ethereum) => {
	const signOrder = signOrderTemplate.bind(null, ethereum, E2E_CONFIG)
	const signNft = signNftTemplate.bind(null, ethereum, E2E_CONFIG.chainId)
	const mint = (x: MintRequest) => mintTemplate(ethereum, send, signNft, nftCollectionApi, nftLazyMintApi, x)
	const v2Handler = new RaribleV2OrderHandler(ethereum, send, E2E_CONFIG)
	const v1Handler = new RaribleV1OrderHandler(ethereum, orderApi, send, E2E_CONFIG)
	const openSeaHandler = new OpenSeaOrderHandler(ethereum, send, E2E_CONFIG)
	const orderService = new OrderFiller(ethereum, v1Handler, v2Handler, openSeaHandler)
	const treasury = createE2eWallet()
	const treasuryAddress = toAddress(treasury.getAddressString())

	it("should mint, sign and upsert order", async () => {
		const contract = E2E_CONFIG.nftContracts.erc721.v3
		const minted = await mint({
			collection: createErc721V3Collection(contract),
			uri: "/",
			creators: [{
				account: makerAddress,
				value: 10000,
			}],
			royalties: [],
			lazy: false,
		} as ERC721RequestV3)
		const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })

		const order: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			salt: toBigNumber("10"),
			maker: makerAddress,
			type: "RARIBLE_V2",
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: resultNft.contract,
					tokenId: resultNft.tokenId,
				},
				value: resultNft.supply,
			},
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("1"),
			},
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [{
					account: treasuryAddress,
					value: 100,
				}],
			},
		}

		const upserter = new UpsertOrder(orderService, checkLazyOrder, approve, signOrder, orderApi)
		const upsert = upserter.upsert.start({ order })
		const resultOrder = await upsert.runAll()
		expect(resultOrder.hash).toBeTruthy()
		const savedOrder = await orderApi.getOrderByHash({ hash: resultOrder.hash })
		expect(savedOrder.hash).toBeTruthy()
	}, 10000)
})
