import type { BigNumber } from "@rarible/types"
import type { Part } from "@rarible/ethereum-api-client"

export type PutBidRequest = {
	hash: string
	priceDecimal: BigNumber
	originFees?: Part[]
}
