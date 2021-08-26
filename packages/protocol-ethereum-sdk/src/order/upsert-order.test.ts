import { toAddress } from "@rarible/types/build/address"
import { Configuration, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { toBigNumber } from "@rarible/types"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { E2E_CONFIG } from "../config/e2e"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { upsertOrder } from "./upsert-order"
import { signOrder } from "./sign-order"
import { getMakeFee } from "./get-make-fee"

describe("upsertOrder", () => {
	const { provider, wallet } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")

	test("sign and upsert works", async () => {
		const approve = () => Promise.resolve(undefined)
		const web3 = new Web3(provider)
		const sign = signOrder.bind(null, new Web3Ethereum({ web3 }), E2E_CONFIG)
		const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
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
		await upsert.run(0)
		await upsert.run(1)
		await upsert.run(2)
		const result = await upsert.result
		expect(result.hash).toBeTruthy()
	})
})
