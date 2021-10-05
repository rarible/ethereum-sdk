import { Ethereum } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { ActionBuilder } from "@rarible/action"
import { SimpleOrder } from "../types"
import {
	FillOrderAction,
	OrderHandler,
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
		if (isLegacyRequest(request)) {
			return this.fillInternal(request, this.v1Handler)
		} else if (isOrderV2Request(request)) {
			return this.fillInternal(request, this.v2Handler)
		} else if (isOpenseaOrderV1Request(request)) {
			return this.fillInternal(request, this.openSeaHandler)
		}
		throw new Error(`Unsupported request: ${JSON.stringify(request)}`)
	}

	private async fillInternal<T extends FillOrderRequest>(
		request: T, handler: OrderHandler<T>,
	): Promise<FillOrderAction> {
		const from = toAddress(await this.ethereum.getFrom())
		const inverted = handler.invert(request, from)
		return ActionBuilder
			.create({
				id: "approve" as const,
				run: () => handler.approve(inverted, Boolean(request.infinite)),
			})
			.thenStage({
				id: "send-tx",
				run: () => handler.sendTransaction(request.order, inverted, request),
			})
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

function isLegacyRequest(request: FillOrderRequest): request is LegacyOrderFillRequest {
	return request.order.type === "RARIBLE_V1"
}

function isOrderV2Request(request: FillOrderRequest): request is RaribleV2OrderFillRequest {
	return request.order.type === "RARIBLE_V2"
}

function isOpenseaOrderV1Request(request: FillOrderRequest): request is OpenSeaV1OrderFillRequest {
	return request.order.type === "OPEN_SEA_V1"
}
