import type { Part } from "@rarible/ethereum-api-client"
import type { BigNumber } from "@rarible/types"
import { toBn } from "@rarible/utils"
import { BigNumber as BigNum } from "@rarible/utils"
import { encodePartToBuffer } from "../../encode-data"

/**
 * Check requirements for origin fees, converting them to single uint value
 * @param originFees
 */
export function originFeeValueConvert(originFees?: Part[]): {
	originFeeConverted: [BigNumber, BigNumber]
	totalFeeBasisPoints: number,
} {
	if (originFees && originFees.length > 2) {
		throw new Error("This method supports max up to 2 origin fee values")
	}

	const originFeeConverted: [BigNumber, BigNumber] = [
		encodePartToBuffer(originFees?.[0]),
		encodePartToBuffer(originFees?.[1]),
	]

	const totalFeeBasisPoints = (originFees?.[0]?.value ?? 0) + (originFees?.[1]?.value ?? 0)

	return {
		originFeeConverted,
		totalFeeBasisPoints,
	}
}

/**
 * Add fee to value
 * @param value
 * @param feesBasisPoints
 */
export function calcValueWithFees(value: BigNumber, feesBasisPoints: number): BigNum {
	const feesValue = toBn(feesBasisPoints)
		.dividedBy(10000)
		.multipliedBy(value)
		.integerValue(BigNum.ROUND_FLOOR)

	return feesValue.plus(value)
}
