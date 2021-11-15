import { toAddress, toBigNumber, toBinary } from "@rarible/types"
import type { OrderForm } from "@rarible/ethereum-api-client"
import { Configuration, OrderControllerApi } from "@rarible/ethereum-api-client"
import { createE2eProvider, awaitAll } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils"
import { getEthereumConfig } from "../config"
import { getApiConfig } from "../config/api-config"
import { createTestProviders } from "../common/create-test-providers"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { UpsertOrder } from "./upsert-order"
import { signOrder } from "./sign-order"
import { RaribleV2OrderHandler } from "./fill-order/rarible-v2"
import { OrderFiller } from "./fill-order"
import { deployTestErc20 } from "./contracts/test/test-erc20"

const { provider, wallet } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
const { providers, web3 } = createTestProviders(provider, wallet)
const it = awaitAll({
	testErc20: deployTestErc20(web3, "TST", "TST"),
})

describe.each(providers)("upsertOrder", (ethereum) => {
	const config = getEthereumConfig("e2e")
	const sign = signOrder.bind(null, ethereum, config)
	const v2Handler = new RaribleV2OrderHandler(null as any, null as any, config)
	const orderService = new OrderFiller(null as any, null as any, v2Handler, null as any, null as any)
	const approve = () => Promise.resolve(undefined)
	const configuration = new Configuration(getApiConfig("e2e"))
	const orderApi = new OrderControllerApi(configuration)
	const checkLazyOrder: any = async (form: any) => Promise.resolve(form)

	test("sign and upsert works", async () => {

		const order: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			salt: toBigNumber("10") as any,
			maker: toAddress(wallet.getAddressString()),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
			signature: toBinary("0x"),
		}
		const upserter = new UpsertOrder(
			orderService,
			checkLazyOrder,
			approve,
			sign,
			orderApi,
			ethereum
		)

		const result = await upserter.upsert({ order })
		expect(result.hash).toBeTruthy()
	})

	test("getPrice should work with ETH", async () => {
		const request = {
			maker: toAddress(wallet.getAddressString()),
			makeAssetType: {
				assetClass: "ERC721",
				contract: toAddress("0x0000000000000000000000000000000000000001"),
				tokenId: toBigNumber("1"),
			},
			priceDecimal: toBn("0.000000000000000001"),
			takeAssetType: {
				assetClass: "ETH" as const,
			},
			amount: 1,
			payouts: [],
			originFees: [],
		}
		const upserter = new UpsertOrder(
			orderService,
			checkLazyOrder,
			approve,
			sign,
			orderApi,
			ethereum
		)

		const price = await upserter.getPrice(request, request.takeAssetType)
		expect(price.valueOf()).toBe("1")
	})

	test("getPrice should work with ERC20", async () => {
		const request = {
			maker: toAddress(wallet.getAddressString()),
			makeAssetType: {
				assetClass: "ERC721",
				contract: toAddress("0x0000000000000000000000000000000000000001"),
				tokenId: toBigNumber("1"),
			},
			priceDecimal: toBn("0.000000000000000001"),
			takeAssetType: {
				assetClass: "ERC20" as const,
				contract: toAddress(it.testErc20.options.address),
			},
			amount: 1,
			payouts: [],
			originFees: [],
		}
		const upserter = new UpsertOrder(
			orderService,
			checkLazyOrder,
			approve,
			sign,
			orderApi,
			ethereum
		)

		const price = await upserter.getPrice(request, request.takeAssetType)
		expect(price.valueOf()).toBe("1")
	})
})
