import { signOrder } from "./sign-order"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { createE2eProvider } from "../test/create-e2e-provider"

describe("signOrder", () => {

	const { web3, wallet } = createE2eProvider()

	test("should sign legacy orders", async () => {
		const signature = await signOrder(
			web3,
			wallet.getAddressString(),
			{
				...TEST_ORDER_TEMPLATE,
				type: "RARIBLE_V1",
				data: {
					dataType: "LEGACY",
					fee: 100,
				},
			},
		)
		expect(signature.signature).toEqual("0x8ff2ec0cb773bcc98ad2331b29a19dd0ae956703b07993f37da4bf44eea8ca30429e6eae174a999d6a6030885ec8e1b44f691c8f4138a7076d1ddcc7e92347591c")
	})

	test("should sign v2 orders", async () => {
		const signature = await signOrder(
			web3,
			wallet.getAddressString(),
			{
				...TEST_ORDER_TEMPLATE,
				type: "RARIBLE_V2",
				data: {
					dataType: "RARIBLE_V2_DATA_V1",
					payouts: [],
					originFees: [],
				},
			},
		)
		expect(signature.signature).toEqual("0xe7febac2754d2d452f8e4ff6e4aca80ee80d2b4a7185903ae38b0a2ff8b4bb741ab25668e1291cd407ea31cd8e44c3a7ea0baec08dadbe1215dcf9a58cddd7531b")
	})
})

