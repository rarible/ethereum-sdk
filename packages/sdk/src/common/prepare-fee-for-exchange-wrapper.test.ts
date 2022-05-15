import type { Part } from "@rarible/ethereum-api-client"
import { toAddress } from "@rarible/types"
import { prepareForExchangeWrapperFees } from "./prepare-fee-for-exchange-wrapper"

describe("Prepare fees for exchangeWrapper contract", () => {
	test("Should make correct value",  () => {
		const part1: Part = { account: toAddress("0x1cf0df2a5a20cd61d68d4489eebbf85b8d39e18a"), value: 1500 }
		expect(prepareForExchangeWrapperFees( [part1]))
			.toEqual(["2192417679357236515193739779967808825286849667391882"])

		const part2: Part = { account: toAddress("0x1cf0df2a5a20cd61d68d4489eebbf85b8d39e18a"), value: 10000 }
		expect(prepareForExchangeWrapperFees( [part2]))
			.toEqual(["14615181596669911319925060858056214492362276282687882"])
		expect(prepareForExchangeWrapperFees( []))
			.toEqual([])

		const part3: Part = { account: toAddress("0x1cf0df2a5a20cd61d68d4489eebbf85b8d39e18a"), value: 250 }
		expect(prepareForExchangeWrapperFees( [part3]))
			.toEqual(["365540632693607867439133739072455050716933988671882"])

		const part4: Part = { account: toAddress("0x4C9d38c11c1c72bDCB71199b82E8BA869599E099"), value: 250 }
		expect(prepareForExchangeWrapperFees( [part4]))
			.toEqual(["365812798792304385752336880218562362090832503890073"])
	})
})
