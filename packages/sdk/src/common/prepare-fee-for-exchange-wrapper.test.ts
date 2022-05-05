import type { Part } from "@rarible/ethereum-api-client"
import { toAddress } from "@rarible/types"
import { prepareForExchangeWrapperFees } from "./prepare-fee-for-exchange-wrapper"

describe("Prepare fees for exchangeWrapper contract", () => {
	test("Should make correct value",  () => {
		const part1: Part = { account: toAddress("0x627306090abaB3A6e1400e9345bC60c78a8BEf57"), value: 1500 }
		expect(prepareForExchangeWrapperFees([part1]))
			.toEqual(["2192814502203343463184359742067940770404457211752279"])
		const part2: Part = { account: toAddress("0x627306090abaB3A6e1400e9345bC60c78a8BEf57"), value: 10000 }
		expect(prepareForExchangeWrapperFees([part2]))
			.toEqual(["14615578419516018267915680820156346437479883827048279"])
	})
})
