import { Asset } from "@rarible/protocol-api-client"
import { BigNumber, toBn } from "@rarible/utils"
import { toBigNumber } from "@rarible/types"
import { ExchangeFees } from "../config/type"
import { SimpleOpenSeaV1Order, SimpleOrder } from "./sign-order"
import { isNft } from "./is-nft"

export type GetMakeFeeFunction = (order: SimpleOrder) => number

export function getMakeFee(fees: ExchangeFees, order: SimpleOrder): number {
	if (order.type === "RARIBLE_V2") {
		return getMakeFeeV2(fees, order)
	} else if (order.type === "OPEN_SEA_V1") {
		return 0
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

export function getOpenseaAmountWithFeeV1(order: SimpleOpenSeaV1Order) {
	if (order.data.side === "SELL") {
		let asset: Asset = order.take

		const fees = toBn(order.data.takerProtocolFee)
			.plus(order.data.takerRelayerFee)
			.plus(10000)

		const amount = toBn(asset.value)
			.multipliedBy(fees)
			.dividedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)

		return {
			...asset,
			value: toBigNumber(amount.toFixed()),
		}
	} else if (order.data.side === "BUY") {
		const asset = order.make
		const fees = toBn(order.data.makerProtocolFee)
			.plus(order.data.makerRelayerFee)
			.plus(10000)

		const amount = toBn(asset.value)
			.multipliedBy(fees)
			.dividedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)

		return {
			...asset,
			value: toBigNumber(amount.toString()),
		}
	}

	return order.take
}
