import { Asset } from "@rarible/protocol-api-client"
import { toBigNumber } from "@rarible/types"
import { BigNumber, toBn } from "@rarible/utils"

export function addFee(asset: Asset, fee: number): Asset {
	const value = toBn(asset.value)
		.multipliedBy(10000 + fee)
		.dividedBy(10000)
		.integerValue(BigNumber.ROUND_FLOOR)
	return {
		...asset,
		value: toBigNumber(value.toFixed()),
	}
}
