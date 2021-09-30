import { Asset } from "@rarible/protocol-api-client"
import { BigNumberValue } from "@rarible/utils/build/bn"
import { BigNumber, toBn } from "@rarible/utils"
import { ExchangeFees } from "../config/type"
import { SimpleOpenSeaV1Order, SimpleOrder } from "./sign-order"
import { isNft } from "./is-nft"

export type GetMakeFeeFunction = (order: SimpleOrder) => number

export function getMakeFee(fees: ExchangeFees, order: SimpleOrder): number {
	if (order.type === "RARIBLE_V2") {
		return getMakeFeeV2(fees, order)
	} else {
		return 0
	}
}

export function getFeeOpenseaV1(order: SimpleOpenSeaV1Order): BigNumber {
	let asset: Asset
	if (order.data.side === "SELL") {
		asset = order.take
	} else if (order.data.side === "BUY") {
		asset = order.make
	} else {
		throw new Error("Unrecognized order side")
	}
	return toBn(order.data.takerRelayerFee)
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
