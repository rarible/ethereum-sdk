import { toBigNumber } from "@rarible/types"
import { calcValueWithFees } from "./origin-fees-utils"

describe("Should calc value + fee", () => {
	test("Should make correct value",  () => {
		expect(calcValueWithFees(toBigNumber("100000"), 0).toString()).toEqual("100000")
		expect(calcValueWithFees(toBigNumber("100000"), 10).toString()).toEqual("100100")
		expect(calcValueWithFees(toBigNumber("100000"), 500).toString()).toEqual("105000")
		expect(calcValueWithFees(toBigNumber("100000"), 1000).toString()).toEqual("110000")
		expect(calcValueWithFees(toBigNumber("0"), 0).toString()).toEqual("0")
		expect(calcValueWithFees(toBigNumber("0"), 10000).toString()).toEqual("0")
	})
})
