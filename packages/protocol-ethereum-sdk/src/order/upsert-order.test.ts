import { toAddress, toBigNumber } from "@rarible/types"
import { Configuration, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { E2E_CONFIG } from "../config/e2e"
import { getApiConfig } from "../config/api-config"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { upsertOrder } from "./upsert-order"
import { signOrder } from "./sign-order"
import { RaribleV2OrderHandler } from "./fill-order/rarible-v2"
import { OrderFiller } from "./fill-order"

describe("upsertOrder", () => {
	const { provider, wallet } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	const v2Handler = new RaribleV2OrderHandler(null as any, null as any, E2E_CONFIG)
	const orderService = new OrderFiller(null as any, null as any, v2Handler, null as any)

	test("sign and upsert works", async () => {
		const approve = () => Promise.resolve(undefined)
		const web3 = new Web3(provider)
		const sign = signOrder.bind(null, new Web3Ethereum({ web3 }), E2E_CONFIG)
		const configuration = new Configuration(getApiConfig("e2e"))
		const orderApi = new OrderControllerApi(configuration)
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
		}
		const checkLazyOrder = async () => Promise.resolve(order)
		const upsert = (
			await upsertOrder(orderService, checkLazyOrder, approve, sign, orderApi, order)
		).build()
		await upsert.runAll()
		const result = await upsert.result
		expect(result.hash).toBeTruthy()
	}, 10000)
})
