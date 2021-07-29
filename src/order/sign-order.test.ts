import { signOrder } from "./sign-order"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { createE2eProvider } from "../test/create-e2e-provider"
import { E2E_CONFIG } from "../config/e2e"
import { toAddress } from "@rarible/types"

describe("signOrder", () => {

	const { web3, wallet } = createE2eProvider()
	const signOrderE2e = signOrder.bind(null, web3, E2E_CONFIG)

	test("should sign legacy orders", async () => {
		const signature = await signOrderE2e(
			{
				...TEST_ORDER_TEMPLATE,
				type: "RARIBLE_V1",
				data: {
					dataType: "LEGACY",
					fee: 100,
				},
				maker: toAddress(wallet.getAddressString())
			},
		)
		expect(signature).toEqual("0xeaf7cd0e5d236fca80c9713cc1017787fd5255b4df68f7c114fdc18422a2409708c721ddc230e9c9aa80567c7b5bbd74b2094ce7989ed8cef8a30582a9f0f35c1b")
	})

	test("should sign v2 orders", async () => {
		const signature = await signOrderE2e(
			{
				...TEST_ORDER_TEMPLATE,
				type: "RARIBLE_V2",
				data: {
					dataType: "RARIBLE_V2_DATA_V1",
					payouts: [],
					originFees: [],
				},
				maker: toAddress(wallet.getAddressString())
			},
		)
		expect(signature).toEqual("0xbc484cf90eb7a83abd1347c8f5686ca5969fbee3fb30f26f924c648f70160b9a2755ccde7ccd7c9ca7a138c94b4fef388047e0b339f01c622cc0b593b89842aa1b")
	})
})

