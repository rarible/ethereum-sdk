import { Ethereum } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { Action } from "@rarible/action"
import { Address} from "@rarible/protocol-api-client"
import { SimpleLegacyOrder, SimpleOpenSeaV1Order, SimpleOrder, SimpleRaribleV2Order } from "../types"
import {
	FillOrderAction,
	FillOrderRequest,
	LegacyOrderFillRequest,
	OpenSeaV1OrderFillRequest,
	RaribleV2OrderFillRequest,
} from "./types"
import { RaribleV1OrderHandler } from "./rarible-v1"
import { RaribleV2OrderHandler } from "./rarible-v2"
import { OpenSeaOrderHandler } from "./open-sea"

export class OrderFiller {

	constructor(
		private readonly ethereum: Ethereum,
		private readonly v1Handler: RaribleV1OrderHandler,
		private readonly v2Handler: RaribleV2OrderHandler,
		private readonly openSeaHandler: OpenSeaOrderHandler,
	) {
		this.fill = this.fill.bind(this)
		this.getBaseOrderFillFee = this.getBaseOrderFillFee.bind(this)
	}

	async fill(request: FillOrderRequest): Promise<FillOrderAction> {
		return this.action.build(request)
	}

	action = Action
		.create({
			id: "approve",
			run: async (request: FillOrderRequest) => {
				const from = toAddress(await this.ethereum.getFrom())
				const inverted = await this.invertOrder(request, from)
				await this.approveOrder(inverted, Boolean(request.infinite))
				return {request, inverted}
			},
		})
		.thenStage({
			id: "send-tx",
			run: async ({inverted, request}: { inverted: SimpleOrder, request: FillOrderRequest }) => {
				return this.sendTransaction(request, inverted)
			},
		})

	async invertOrder(request: FillOrderRequest, from: Address) {
		switch (request.order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.invert(<LegacyOrderFillRequest>request, from)
			case "RARIBLE_V2":
				return this.v2Handler.invert(<RaribleV2OrderFillRequest>request, from)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.invert(<OpenSeaV1OrderFillRequest>request, from)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(request)}`)
		}
	}

	async approveOrder(inverted: SimpleOrder, isInfinite: boolean) {
		switch (inverted.type) {
			case "RARIBLE_V1":
				return this.v1Handler.approve(inverted, isInfinite)
			case "RARIBLE_V2":
				return this.v2Handler.approve(inverted, isInfinite)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.approve(inverted, isInfinite)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	async sendTransaction(request: FillOrderRequest, inverted: SimpleOrder) {
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
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
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
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}
}
