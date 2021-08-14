import { SimpleOrder } from "./sign-order"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { randomAddress } from "@rarible/types"
import { getMakeFee } from "./get-make-fee"
import { toBigNumber } from "@rarible/types/build/big-number"

describe("getMakeFee", () => {
	it("should calculate fee for v2 orders", () => {
		const fee1 = Math.floor(Math.random() * 3000)
		const fee2 = Math.floor(Math.random() * 3000)
		const protofolFee = Math.floor(Math.random() * 3000)
		const order: SimpleOrder = {
			...TEST_ORDER_TEMPLATE,
			make: {
				assetType: {
					assetClass: "ETH"
				},
				value: toBigNumber("100")
			},
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [{ account: randomAddress(), value: fee1 }, { account: randomAddress(), value: fee2 }],
			},
		}

		const result = getMakeFee({ v2: protofolFee }, order)
		expect(result).toBe(protofolFee + fee1 + fee2)
	})
})
