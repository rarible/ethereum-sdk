import { Address } from "@rarible/protocol-api-client"
import { Ethereum, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import { ZERO_WORD } from "@rarible/types"
import { orderToStruct } from "../sign-order"
import { getAssetWithFee } from "../get-asset-with-fee"
import { Config } from "../../config/type"
import { approve } from "../approve"
import { SendFunction } from "../../common/send-transaction"
import { createExchangeV2Contract } from "../contracts/exchange-v2"
import { waitTx } from "../../common/wait-tx"
import { SimpleRaribleV2Order } from "../types"
import { invertOrder } from "./invert-order"
import { OrderHandler, RaribleV2OrderFillRequest } from "./types"

export class RaribleV2OrderHandler implements OrderHandler<RaribleV2OrderFillRequest> {

	constructor(
		private readonly ethereum: Ethereum,
		private readonly send: SendFunction,
		private readonly config: Config,
	) {
	}

	invert(request: RaribleV2OrderFillRequest, maker: Address): SimpleRaribleV2Order {
		const inverted = invertOrder(request.order, request.amount, maker)
		inverted.data = {
			dataType: "RARIBLE_V2_DATA_V1",
			originFees: request.originFees || [],
			payouts: request.payouts || [],
		}
		return inverted
	}

	async approve(order: SimpleRaribleV2Order, infinite: boolean): Promise<void> {
		const withFee = this.getMakeAssetWithFee(order)
		await waitTx(approve(this.ethereum, this.send, this.config.transferProxies, order.maker, withFee, infinite))
	}

	sendTransaction(
		initial: SimpleRaribleV2Order, inverted: SimpleRaribleV2Order,
	): Promise<EthereumTransaction> {
		const exchangeContract = createExchangeV2Contract(this.ethereum, this.config.exchange.v2)
		const method = exchangeContract.functionCall(
			"matchOrders",
			orderToStruct(this.ethereum, initial),
			initial.signature || "0x",
			orderToStruct(this.ethereum, inverted),
			inverted.signature || "0x",
		)
		return this.send(method, this.getMatchV2Options(initial, inverted))
	}

	private getMatchV2Options(
		left: SimpleRaribleV2Order, right: SimpleRaribleV2Order,
	): EthereumSendOptions {
		if (left.make.assetType.assetClass === "ETH" && left.salt === ZERO_WORD) {
			const asset = this.getMakeAssetWithFee(left)
			return { value: asset.value }
		} else if (right.make.assetType.assetClass === "ETH" && right.salt === ZERO_WORD) {
			const asset = this.getMakeAssetWithFee(right)
			return { value: asset.value }
		} else {
			return {}
		}
	}

	private getMakeAssetWithFee(order: SimpleRaribleV2Order) {
		return getAssetWithFee(order.make, this.getOrderFee(order))
	}

	getOrderFee(order: SimpleRaribleV2Order): number {
		return order.data.originFees.map(f => f.value).reduce((v, acc) => v + acc, 0) + this.getBaseOrderFee()
	}

	getBaseOrderFee(): number {
		return this.config.fees.v2
	}
}
