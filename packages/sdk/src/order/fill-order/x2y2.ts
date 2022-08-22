import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { EthereumTransaction } from "@rarible/ethereum-provider/src"
import { toAddress, toBigNumber, ZERO_ADDRESS } from "@rarible/types"
import type { SimpleOrder, SimpleX2Y2Order } from "../types"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { createExchangeWrapperContract } from "../contracts/exchange-wrapper"
import type { RaribleEthereumApis } from "../../common/apis"
import type { X2Y2OrderFillRequest } from "./types"
import { ExchangeWrapperOrderType } from "./types"
import { X2Y2Utils } from "./x2y2-utils/get-order-sign"
import { calcValueWithFees, originFeeValueConvert } from "./common/origin-fees-utils"

export class X2Y2OrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
		private readonly apis: RaribleEthereumApis,
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

		const { encodedFeesValue, feeAddresses, totalFeeBasisPoints } = originFeeValueConvert(request.originFees)

		const x2y2Input = await X2Y2Utils.getOrderSign(this.apis, {
			sender: toAddress(await this.ethereum.getFrom()),
			orderId: order.data.orderId,
			currency: ZERO_ADDRESS,
			price: order.take.value,
		})

		const valueForSending = calcValueWithFees(toBigNumber(order.take.value), totalFeeBasisPoints)

		return this.send(
			wrapper.functionCall("singlePurchase", {
				marketId: ExchangeWrapperOrderType.X2Y2,
				fees: encodedFeesValue,
				amount: order.take.value,
				data: x2y2Input,
			}, feeAddresses[0], feeAddresses[1]),
			{ value: valueForSending.toString() }
		)
	}

	getBaseOrderFee() {
		return this.getBaseOrderFeeConfig("X2Y2")
	}
}
