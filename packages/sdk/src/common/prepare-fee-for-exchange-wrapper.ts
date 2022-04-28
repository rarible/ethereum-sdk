import type { Part } from "@rarible/ethereum-api-client"
import { BN, stripHexPrefix } from "ethereumjs-util"

export function prepareForExchangeWrapperFees(fees: Part[]): string[] {
	return fees.map(fee => {
		const addr = new BN(stripHexPrefix(fee.account), "hex").toString(2)
		return new BN(toBinaryString(fee.value) + "0" + addr, 2).toString(10)
	})
}

export function toBinaryString(value: number): string {
	return new BN((value).toString(), 10).toString(2)
}
