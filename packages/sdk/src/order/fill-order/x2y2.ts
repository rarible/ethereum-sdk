import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { EthereumTransaction } from "@rarible/ethereum-provider/src"
import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import type { BigNumber } from "@rarible/types"
import { BigNumber as BigNum } from "@rarible/utils"
import type { Part } from "@rarible/ethereum-api-client"
import { toBn } from "@rarible/utils"
import type { SimpleOrder, SimpleX2Y2Order } from "../types"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { createExchangeWrapperContract } from "../contracts/exchange-wrapper"
import { encodePartToBuffer } from "../encode-data"
import type { X2Y2OrderFillRequest } from "./types"
import { X2Y2Utils } from "./x2y2-utils/get-order-sign"
import { ExchangeWrapperOrderType } from "./types"

export class X2Y2OrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
	) {}

	async fillOrder(order: SimpleX2Y2Order, request: X2Y2OrderFillRequest): Promise<EthereumTransaction> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}

		const wrapper = createExchangeWrapperContract(this.ethereum, this.config.exchange.wrapper)

		if (!order.data?.orderId) {
			throw new Error("No x2y2 orderId provided")
		}

		if (request.originFees && request.originFees.length > 1) {
			throw new Error("x2y2 supports max up to 2 origin fee value")
		}

		const x2y2Input = X2Y2Utils.getOrderSign({
			sender: toAddress(await this.ethereum.getFrom()),
			op: X2Y2Utils.SELL_OP,
			orderId: order.data.orderId,
			currency: ZERO_ADDRESS,
			price: order.take.value,
		})

		const { originFeeConverted, totalFeeBasisPoints } = originFeeValueConvert(request.originFees)
		const totalValue = calcValueWithFees(order.take.value, totalFeeBasisPoints)

		return this.send(
			wrapper.functionCall("singlePurchase", {
				marketId: ExchangeWrapperOrderType.X2Y2,
				addFee: totalFeeBasisPoints > 0,
				amount: order.take.value,
				data: x2y2Input,
			}, originFeeConverted[0], originFeeConverted[1]),
			{ value: totalValue.toString() }
		)
	}

	getBaseOrderFee() {
		return this.getBaseOrderFeeConfig("X2Y2")
	}
}

export function originFeeValueConvert(originFees?: Part[]): {
	originFeeConverted: [BigNumber, BigNumber]
	totalFeeBasisPoints: number,
} {
	if (originFees && originFees.length > 1) {
		throw new Error("x2y2 supports max up to 2 origin fee value")
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

function calcValueWithFees(value: BigNumber, feesBasisPoints: number): BigNum {
	const feesValue = toBn(feesBasisPoints)
		.dividedBy(10000)
		.multipliedBy(value)
		.integerValue(BigNum.ROUND_FLOOR)

	const valueWithFees = feesValue.plus(value)
	return valueWithFees
}
