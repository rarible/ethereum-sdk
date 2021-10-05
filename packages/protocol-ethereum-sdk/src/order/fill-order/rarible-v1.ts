import { Address, LegacyOrderForm, OrderControllerApi } from "@rarible/protocol-api-client"
import { Ethereum, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import { toBigNumber, ZERO_ADDRESS } from "@rarible/types"
import { toBn } from "@rarible/utils"
import { approve } from "../approve"
import { SendFunction } from "../../common/send-transaction"
import { Config } from "../../config/type"
import { SimpleLegacyOrder } from "../types"
import { getAssetWithFee } from "../get-asset-with-fee"
import { createExchangeV1Contract } from "../contracts/exchange-v1"
import { toLegacyAssetType } from "../to-legacy-asset-type"
import { toVrs } from "../../common/to-vrs"
import { waitTx } from "../../common/wait-tx"
import { invertOrder } from "./invert-order"
import { OrderHandler, LegacyOrderFillRequest } from "./types"

export class RaribleV1OrderHandler implements OrderHandler<LegacyOrderFillRequest> {

	constructor(
		private readonly ethereum: Ethereum,
		private readonly orderApi: OrderControllerApi,
		private readonly send: SendFunction,
		private readonly config: Config,
	) {
	}

	invert(request: LegacyOrderFillRequest, maker: Address): LegacyOrderFillRequest["order"] {
		const inverted = invertOrder(request.order, request.amount, maker)
		inverted.data = {
			dataType: "LEGACY",
			fee: request.originFee,
		}
		return inverted
	}

	async approve(order: SimpleLegacyOrder, infinite: boolean): Promise<void> {
		const withFee = getAssetWithFee(order.make, this.getOrderFee(order))
		await waitTx(approve(this.ethereum, this.send, this.config.transferProxies, order.maker, withFee, infinite))
	}

	getBaseOrderFee(): number {
		return 0
	}

	getOrderFee(order: SimpleLegacyOrder): number {
		return order.data.fee
	}

	async sendTransaction(
		initial: SimpleLegacyOrder, inverted: SimpleLegacyOrder, request: LegacyOrderFillRequest
	): Promise<EthereumTransaction> {
		const buyerFeeSig = await this.orderApi.buyerFeeSignature(
			{ fee: inverted.data.fee, orderForm: fromSimpleOrderToOrderForm(initial) },
		)
		const exchangeContract = createExchangeV1Contract(this.ethereum, this.config.exchange.v1)
		const call = exchangeContract.functionCall(
			"exchange",
			toStructLegacyOrder(initial),
			toVrs(initial.signature!),
			inverted.data.fee,
			toVrs(buyerFeeSig),
			inverted.take.value,
			request.payout ?? ZERO_ADDRESS,
		)
		return this.send(call, getMatchV1Options(inverted))
	}
}

function getMatchV1Options(order: SimpleLegacyOrder): EthereumSendOptions {
	if (order.make.assetType.assetClass === "ETH") {
		const makeAsset = getAssetWithFee(order.make, order.data.fee)
		return { value: makeAsset.value }
	} else {
		return {}
	}
}

export function toStructLegacyOrder(order: SimpleLegacyOrder) {
	if (order.type !== "RARIBLE_V1") {
		throw new Error(`Not supported type: ${order.type}`)
	}
	const data = order.data
	if (data.dataType !== "LEGACY") {
		throw new Error(`Not supported data type: ${data.dataType}`)
	}
	return {
		key: toStructLegacyOrderKey(order),
		selling: order.make.value,
		buying: order.take.value,
		sellerFee: data.fee,
	}
}

export function toStructLegacyOrderKey(order: SimpleLegacyOrder) {
	return {
		owner: order.maker,
		salt: order.salt,
		sellAsset: toLegacyAssetType(order.make.assetType),
		buyAsset: toLegacyAssetType(order.take.assetType),
	}
}

function fromSimpleOrderToOrderForm(order: SimpleLegacyOrder): LegacyOrderForm {
	return {
		...order,
		salt: toBigNumber(toBn(order.salt).toString()),
	}
}
