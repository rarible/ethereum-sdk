import { toAddress, toBigNumber } from "@rarible/types"
import { calcValueWithFees, originFeeValueConvert } from "./origin-fees-utils"

describe("originFee wrapper utils", () => {
	test("Should calc correct value + fee",  () => {
		expect(calcValueWithFees(toBigNumber("100000"), 0).toString()).toEqual("100000")
		expect(calcValueWithFees(toBigNumber("100000"), 10).toString()).toEqual("100100")
		expect(calcValueWithFees(toBigNumber("100000"), 500).toString()).toEqual("105000")
		expect(calcValueWithFees(toBigNumber("100000"), 1000).toString()).toEqual("110000")
		expect(calcValueWithFees(toBigNumber("0"), 0).toString()).toEqual("0")
		expect(calcValueWithFees(toBigNumber("0"), 10000).toString()).toEqual("0")
	})

	test("Should make correct originFee convert to encoded fee value & addresses",  () => {
		expect(originFeeValueConvert([])).toEqual({
			encodedFeesValue: "0x0000000000000000000000000000000000000000000000000000000000000000",
			totalFeeBasisPoints: 0,
			feeAddresses: [
				toAddress("0x0000000000000000000000000000000000000000"),
				toAddress("0x0000000000000000000000000000000000000000"),
			],
		})

		expect(originFeeValueConvert([{
			account: toAddress("0xFc7b41fFC023bf3eab6553bf4881D45834EF1E8a"),
			value: 10000,
		}, {
			account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
			value: 16,
		}])).toEqual({
			encodedFeesValue: "0x0000000000000000000000000000000000000000000000000000000027100010",
			totalFeeBasisPoints: 10016,
			feeAddresses: [
				toAddress("0xFc7b41fFC023bf3eab6553bf4881D45834EF1E8a"),
				toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
			],
		})

		expect(originFeeValueConvert([{
			account: toAddress("0xFc7b41fFC023bf3eab6553bf4881D45834EF1E8a"),
			value: 3678,
		}])).toEqual({
			encodedFeesValue: "0x000000000000000000000000000000000000000000000000000000000e5e0000",
			totalFeeBasisPoints: 3678,
			feeAddresses: [
				toAddress("0xFc7b41fFC023bf3eab6553bf4881D45834EF1E8a"),
				toAddress("0x0000000000000000000000000000000000000000"),
			],
		})
	})
})
