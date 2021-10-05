import { toAddress } from "@rarible/types"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { E2E_CONFIG } from "../config/e2e"
import { signOrder } from "./sign-order"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { SimpleOrder } from "./types"

describe("signOrder", () => {
	const { provider } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const signOrderE2e = signOrder.bind(null, ethereum, E2E_CONFIG)

	test("should sign legacy orders", async () => {
		const signer = await ethereum.getFrom()
		const order: SimpleOrder = {
			...TEST_ORDER_TEMPLATE,
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 100,
			},
			maker: toAddress(signer),
		}

		const signature = await signOrderE2e(order)

		expect(signature).toEqual(
			"0x5fec2e13b0ad828fd4bd8908ca695518ecf8256218cf6d0c1fb3ecb460c8510222a2d52b9946c761217fcadfa88f7e120707c4fa1c441fb6c34f5bf5df821b741b"
		)
	})

	test("should sign v2 orders", async () => {
		const signer = await ethereum.getFrom()
		const signature = await signOrderE2e({
			...TEST_ORDER_TEMPLATE,
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
			maker: toAddress(signer),
		})
		expect(signature).toEqual(
			"0xcbaf8914c5da5efea1c8d3afa70d93147ec842632b4db1f62475c9ed107b07220496c37efa66fcfac2a54caa252ecbf77db79428d53b48ea39b89d8211bfa8151c"
		)
	})
})
