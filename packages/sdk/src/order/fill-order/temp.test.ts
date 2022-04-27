import { BN, stripHexPrefix } from "ethereumjs-util"
import type { Part } from "@rarible/ethereum-api-client"
import { toAddress } from "@rarible/types"

describe("test", () => {
	test("test bn", () => {
		const address = toAddress("0x627306090abaB3A6e1400e9345bC60c78a8BEf57")
		const rrrrrr = "5dc2191ef87e392377ec08e7c08eb105ef5448eced5"
		const feee = 1500

		const resultBn = new BN("0000000000000005dc", "hex")
		const result = new BN("1500", 10)
		const r = new BN("627306090abaB3A6e1400e9345bC60c78a8BEf57", "hex")
		console.log(resultBn.byteLength())
		console.log(resultBn.toNumber())
		console.log(result.add(r))
		console.log(prepareOpenseaWrapperFees([{account: address, value: feee}]))
	})
})
function prepareOpenseaWrapperFees(fees: Part[]): BN[] {
	return fees.map(fee => {
		const addr = new BN(stripHexPrefix(fee.account), "hex")
		const amount = new BN(fee.value)
		return amount.add(addr)
	})
}

// feesUPFirst 2192444107165922302131167498652921098973517425069781
