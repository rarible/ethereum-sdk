import { signOrder } from "./sign-order"
import { toAddress } from "@rarible/types/build/address"
import { Configuration, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { upsertOrder } from "./upsert-order"
import fetch from "node-fetch"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { createE2eProvider } from "../test/create-e2e-provider"
import { toBigNumber } from "@rarible/types"
import { E2E_CONFIG } from "../config/e2e"


describe("upsertOrder", () => {
	const { web3, wallet } = createE2eProvider()

	test("sign and upsert works", async () => {
		const approve = () => Promise.resolve("")
		const sign = signOrder.bind(null, web3, E2E_CONFIG)
		const api = new OrderControllerApi(new Configuration({ basePath: "https://api-e2e.rarible.com", fetchApi: fetch }))
		const order: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			salt: toBigNumber("10"),
			maker: toAddress(wallet.getAddressString()),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: []
			}
		}
		const upsert = await upsertOrder(approve, sign, api, order)
		await upsert.run(0)
		await upsert.run(1)
		await upsert.run(2)
		const result = await upsert.result
		expect(result.hash).toBeTruthy()
	})
})
