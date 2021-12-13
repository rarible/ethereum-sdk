import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { Action } from "@rarible/action"
import type { Address } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import type {
	SimpleCryptoPunkOrder,
	SimpleLegacyOrder,
	SimpleOpenSeaV1Order,
	SimpleOrder,
	SimpleRaribleV2Order,
} from "../types"
import type {
	CryptoPunksOrderFillRequest,
	FillOrderAction,
	FillOrderRequest,
	LegacyOrderFillRequest,
	OpenSeaV1OrderFillRequest,
	RaribleV2OrderFillRequest,
} from "./types"
import type { RaribleV1OrderHandler } from "./rarible-v1"
import type { RaribleV2OrderHandler } from "./rarible-v2"
import type { OpenSeaOrderHandler } from "./open-sea"
import type { CryptoPunksOrderHandler } from "./crypto-punks"
import type { OrderFillTransactionData, FillOrderStageId } from "./types"

export class OrderFiller {

	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly v1Handler: RaribleV1OrderHandler,
		private readonly v2Handler: RaribleV2OrderHandler,
		private readonly openSeaHandler: OpenSeaOrderHandler,
		private readonly punkHandler: CryptoPunksOrderHandler
	) {
		this.getBaseOrderFillFee = this.getBaseOrderFillFee.bind(this)
		this.getTransactionData = this.getTransactionData.bind(this)
	}

	private getFillAction<Request extends FillOrderRequest>(): Action<FillOrderStageId, Request, EthereumTransaction> {
		return Action
			.create({
				id: "approve" as const,
				run: async (request: Request) => {
					if (!this.ethereum) {
						throw new Error("Wallet undefined")
					}
					const from = toAddress(await this.ethereum.getFrom())
					const inverted = await this.invertOrder(request, from)
					await this.approveOrder(inverted, Boolean(request.infinite))
					return { request, inverted }
				},
			})
			.thenStep({
				id: "send-tx" as const,
				run: async ({ inverted, request }: { inverted: SimpleOrder, request: Request }) => {
					return this.sendTransaction(request, inverted)
				},
			})
	}

	/**
	 * @deprecated Use {@link buy} or {@link acceptBid} instead
	 */
	fill: FillOrderAction = this.getFillAction()

	/**
	 * Buy order
	 */
	buy: FillOrderAction = this.getFillAction()

	/**
	 * Accept bid order
	 */
	acceptBid: FillOrderAction = this.getFillAction()

	private async invertOrder(request: FillOrderRequest, from: Address) {
		switch (request.order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.invert(<LegacyOrderFillRequest>request, from)
			case "RARIBLE_V2":
				return this.v2Handler.invert(<RaribleV2OrderFillRequest>request, from)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.invert(<OpenSeaV1OrderFillRequest>request, from)
			case "CRYPTO_PUNK":
				return this.punkHandler.invert(<CryptoPunksOrderFillRequest>request, from)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(request)}`)
		}
	}

	private async approveOrder(inverted: SimpleOrder, isInfinite: boolean) {
		switch (inverted.type) {
			case "RARIBLE_V1":
				return this.v1Handler.approve(inverted, isInfinite)
			case "RARIBLE_V2":
				return this.v2Handler.approve(inverted, isInfinite)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.approve(inverted, isInfinite)
			case "CRYPTO_PUNK":
				return this.punkHandler.approve(inverted, isInfinite)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	private async sendTransaction(request: FillOrderRequest, inverted: SimpleOrder) {
		switch (inverted.type) {
			case "RARIBLE_V1":
				return this.v1Handler.sendTransaction(
					<SimpleLegacyOrder>request.order,
					inverted,
					<LegacyOrderFillRequest>request
				)
			case "RARIBLE_V2":
				return this.v2Handler.sendTransaction(<SimpleRaribleV2Order>request.order, inverted)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.sendTransaction(<SimpleOpenSeaV1Order>request.order, inverted)
			case "CRYPTO_PUNK":
				return this.punkHandler.sendTransaction(<SimpleCryptoPunkOrder>request.order, inverted)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	async getTransactionData(
		request: FillOrderRequest
	): Promise<OrderFillTransactionData> {
		switch (request.order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.getTransactionFromRequest(
          <LegacyOrderFillRequest>request,
				)
			case "RARIBLE_V2":
				return this.v2Handler.getTransactionFromRequest(
          <RaribleV2OrderFillRequest>request,
				)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.getTransactionFromRequest(
          <OpenSeaV1OrderFillRequest>request,
				)
			case "CRYPTO_PUNK":
				return this.punkHandler.getTransactionFromRequest(
          <CryptoPunksOrderFillRequest>request
				)
			default:
				throw new Error(`Unsupported request: ${JSON.stringify(request)}`)
		}
	}

	async getOrderFee(order: SimpleOrder): Promise<number> {
		switch (order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.getOrderFee(order)
			case "RARIBLE_V2":
				return this.v2Handler.getOrderFee(order)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.getOrderFee(order)
			case "CRYPTO_PUNK":
				return this.punkHandler.getOrderFee()
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}

	async getBaseOrderFillFee(order: SimpleOrder): Promise<number> {
		switch (order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.getBaseOrderFee()
			case "RARIBLE_V2":
				return this.v2Handler.getBaseOrderFee()
			case "OPEN_SEA_V1":
				return this.openSeaHandler.getBaseOrderFee(order)
			case "CRYPTO_PUNK":
				return this.punkHandler.getBaseOrderFee()
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}
}
