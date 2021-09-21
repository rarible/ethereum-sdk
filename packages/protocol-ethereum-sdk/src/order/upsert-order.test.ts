import { toAddress, toBigNumber } from "@rarible/types"
import { Configuration, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { E2E_CONFIG } from "../config/e2e"
import { getApiConfig } from "../config/api-config"
import { createTestProviders } from "../common/create-test-providers"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { upsertOrder } from "./upsert-order"
import { signOrder } from "./sign-order"
import { getMakeFee } from "./get-make-fee"

const { provider, wallet } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
const { providers } = createTestProviders(provider, wallet)

describe.each(providers)("upsertOrder", (ethereum) => {
	const sign = signOrder.bind(null, ethereum, E2E_CONFIG)

	test("sign and upsert works", async () => {
		const approve = () => Promise.resolve(undefined)
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
			await upsertOrder(getMakeFee.bind(null, { v2: 0 }), checkLazyOrder, approve, sign, orderApi, order)
		).build()
		await upsert.runAll()
		const result = await upsert.result
		expect(result.hash).toBeTruthy()
	}, 10000)
})
