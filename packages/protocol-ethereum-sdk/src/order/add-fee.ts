import { Asset } from "@rarible/protocol-api-client"
import { toBigNumber } from "@rarible/types/build/big-number"
import { BigNumber, toBn } from "@rarible/utils/build/bn"

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
