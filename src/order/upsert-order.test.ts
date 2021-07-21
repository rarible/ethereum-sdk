import Web3 from "web3"
import { signOrder } from "./sign-order"
import Wallet from "ethereumjs-wallet"
import { toAddress } from "@rarible/types/build/address"
import { Configuration, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import Web3ProviderEngine from "web3-provider-engine"
// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { TestSubprovider } from "@rarible/test-provider"
import { upsertOrder } from "./upsert-order"
import fetch from "node-fetch"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import FormData from "form-data"

(global as any).FormData = FormData

const provider = new Web3ProviderEngine()
const wallet = new Wallet(Buffer.from("d5012fe4e1c34f91d3d4ee8cec93af36f0100a719678d1bdaf4cf65eac833bac", "hex"))
provider.addProvider(new TestSubprovider(wallet))
provider.addProvider(new RpcSubprovider({ rpcUrl: "https://node-e2e.rarible.com" }))
const web3 = new Web3(provider)

describe("upsertOrder", () => {
	test("sign and upsert works", async () => {
		const approve = () => Promise.resolve("")
		const sign = signOrder.bind(null, web3)
		const api = new OrderControllerApi(new Configuration({ basePath: "https://api-e2e.rarible.com", fetchApi: fetch }))
		const order: OrderForm = {
			...TEST_ORDER_TEMPLATE,
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
		console.log("got", result)
	})

	beforeAll(() => {
		provider.start()
	})

	afterAll(() => {
		provider.stop()
	})
})
