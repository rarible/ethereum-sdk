import type { Address } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import { ZERO_WORD } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import { hashToSign, orderToStruct } from "../sign-order"
import { getAssetWithFee } from "../get-asset-with-fee"
import type { EthereumConfig } from "../../config/type"
import { approve } from "../approve"
import type { SendFunction } from "../../common/send-transaction"
import { createExchangeV2Contract } from "../contracts/exchange-v2"
import { waitTx } from "../../common/wait-tx"
import type { SimpleRaribleV2Order } from "../types"
import { isSigner } from "../../common/is-signer"
import { fixSignature } from "../../common/fix-signature"
import { invertOrder } from "./invert-order"
import type { OrderHandler, RaribleV2OrderFillRequest } from "./types"
import type { OrderFillSendData } from "./types"

export class RaribleV2OrderHandler implements OrderHandler<RaribleV2OrderFillRequest> {

	constructor(
		readonly ethereum: Maybe<Ethereum>,
		readonly send: SendFunction,
		readonly config: EthereumConfig,
	) {}

	invert(request: RaribleV2OrderFillRequest, maker: Address): SimpleRaribleV2Order {
		const inverted = invertOrder(request.order, request.amount, maker)
		switch (request.order.data.dataType) {
			case "RARIBLE_V2_DATA_V1": {
				inverted.data = {
					dataType: "RARIBLE_V2_DATA_V1",
					originFees: request.originFees || [],
					payouts: request.payouts || [],
				}
				break
			}
			case "RARIBLE_V2_DATA_V2": {
				inverted.data = {
					dataType: "RARIBLE_V2_DATA_V2",
					originFees: request.originFees || [],
					payouts: request.payouts || [],
					isMakeFill: !request.order.data.isMakeFill,
				}
				break
			}
			default: throw new Error("Unsupported order dataType")
		}
		return inverted
	}

	async approve(order: SimpleRaribleV2Order, infinite: boolean): Promise<void> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const withFee = this.getMakeAssetWithFee(order)
		await waitTx(approve(this.ethereum, this.send, this.config.transferProxies, order.maker, withFee, infinite))
	}

	async getTransactionData(
		initial: SimpleRaribleV2Order, inverted: SimpleRaribleV2Order
	): Promise<OrderFillSendData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const exchangeContract = createExchangeV2Contract(this.ethereum, this.config.exchange.v2)
		const functionCall = exchangeContract.functionCall(
			"matchOrders",
			await this.fixForTx(initial),
			fixSignature(initial.signature) || "0x",
			orderToStruct(this.ethereum, inverted),
			fixSignature(inverted.signature) || "0x",
		)

		return {
			functionCall,
			options: this.getMatchV2Options(initial, inverted),
		}
	}

	async sendTransaction(
		initial: SimpleRaribleV2Order, inverted: SimpleRaribleV2Order,
	): Promise<EthereumTransaction> {
		const {functionCall, options} = await this.getTransactionData(initial, inverted)
		return this.send(functionCall, options)
	}

	async fixForTx(order: SimpleRaribleV2Order): Promise<any> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const hash = hashToSign(this.config, this.ethereum, order)
		const isMakerSigner = await isSigner(this.ethereum, order.maker, hash, order.signature!)
		return orderToStruct(this.ethereum, order, !isMakerSigner)
	}

	getMatchV2Options(
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

	getMakeAssetWithFee(order: SimpleRaribleV2Order) {
		return getAssetWithFee(order.make, this.getOrderFee(order))
	}

	getOrderFee(order: SimpleRaribleV2Order): number {
		return order.data.originFees.map(f => f.value).reduce((v, acc) => v + acc, 0) + this.getBaseOrderFee()
	}

	getBaseOrderFee(): number {
		return this.config.fees.v2
	}
}
