import { BN, stripHexPrefix } from "ethereumjs-util"
import type { Part } from "@rarible/ethereum-api-client"
import { toAddress } from "@rarible/types"

describe("test", () => {
	test("test bn", () => {
		const address = toAddress("0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5")
		const rrrrrr = "5dc2191ef87e392377ec08e7c08eb105ef5448eced5"
		const feee = 1500

		const resultBn = new BN("2192444107165922302131167498652921098973517425069781")
		const result = new BN("1500", 10)
		const r = new BN("2191eF87E392377ec08E7c08Eb105Ef5448eCED5", "hex")
		console.log(resultBn.toString("hex"))
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

// feeRecipienterUP
const bign = {
	negative: 0,
	words: [
		9359061,
		1555793,
		62951089,
		33227321,
		65245751,
		6585313,
		24002,,
	],
	length: 7,
	red: null,
}
// feesUPFirst 2192444107165922302131167498652921098973517425069781
