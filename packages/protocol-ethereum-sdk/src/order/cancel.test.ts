import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { Configuration, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { E2E_CONFIG } from "../config/e2e"
import { getApiConfig } from "../config/api-config"
import { retry } from "../common/retry"
import { cancel } from "./cancel"
import { signOrder } from "./sign-order"
import { upsertOrder } from "./upsert-order"
import { getMakeFee } from "./get-make-fee"
import { TEST_ORDER_TEMPLATE } from "./test/order"

const { provider, wallet } = createE2eProvider()
const web3 = new Web3(provider)
const ethereum = new Web3Ethereum({ web3 })
const approve = () => Promise.resolve(undefined)
const sign = signOrder.bind(null, ethereum, E2E_CONFIG)
const configuration = new Configuration(getApiConfig("e2e"))
const orderApi = new OrderControllerApi(configuration)
const makeFee = getMakeFee.bind(null, { v2: 0 })

describe("cancel order", () => {

	test("ExchangeV2 should work", async () => {
		const form: OrderForm = {
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
		await testOrder(form)
	})

	/*
	test("ExchangeV1 should work", async () => {
		const form: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			salt: toBigNumber("10") as any,
			maker: toAddress(wallet.getAddressString()),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 0,
			},
		}
		await testOrder(form)
	})
*/

	async function testOrder(form: OrderForm) {
		const checkLazyOrder = async () => Promise.resolve(form)
		const a = await upsertOrder(makeFee, checkLazyOrder, approve, sign, orderApi, form)
		const order = await a.build().runAll()

		const tx = await cancel(ethereum, E2E_CONFIG.exchange, order)
		await tx.wait()

		await retry(10, async () => {
			const fetched = await orderApi.getOrderByHash({ hash: order.hash })
			expect(fetched.cancelled).toBe(true)
		})
	}
})
