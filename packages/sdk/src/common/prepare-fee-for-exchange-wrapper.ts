import type { Part } from "@rarible/ethereum-api-client"
import { BN, stripHexPrefix } from "ethereumjs-util"

export function prepareForExchangeWrapperFees(fees: Part[]): string[] {
	return fees.map(fee => {
		const addr = stripHexPrefix(fee.account)
		const preparedFee = new BN(fee.value, 10).toString(16).padStart(24, "0")
		return new BN(preparedFee + addr, 16).toString(10)
	})
}
