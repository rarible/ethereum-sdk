import { ExchangeFees } from "../config/type"
import { SimpleOrder } from "./sign-order"
import { isNft } from "./is-nft"

export type GetMakeFeeFunction = (order: SimpleOrder) => number

export function getMakeFee(fees: ExchangeFees, order: SimpleOrder): number {
	if (order.type === "RARIBLE_V2") {
		return getMakeFeeV2(fees, order)
	} else {
		return 0
	}
}

function getMakeFeeV2(fees: ExchangeFees, order: SimpleOrder) {
	//todo fee may be lower than this (if take is not NFT too)
	if (!isNft(order.make.assetType)) {
		if (order.data.dataType !== "RARIBLE_V2_DATA_V1") {
			throw new Error(`Type ${order.data.dataType} not supported for V2 orders`)
		}
		const originFees = order.data.originFees.map(f => f.value).reduce((v, acc) => v + acc, 0)
		return fees.v2 + originFees
	} else {
		return 0
	}
}
