import { Ethereum } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { ActionBuilder } from "@rarible/action"
import {
	FillOrderAction,
	FillOrderHandler,
	FillOrderRequest,
	LegacyOrderFillRequest,
	OpenSeaV1OrderFillRequest,
	RaribleV2OrderFillRequest,
} from "./types"
import { RaribleV1FillOrderHandler } from "./rarible-v1"
import { RaribleV2FillOrderHandler } from "./rarible-v2"
import { OpenSeaFillOrderHandler } from "./open-sea"

export class OrderFiller {

	constructor(
		private readonly ethereum: Ethereum,
		private readonly v1FillHandler: RaribleV1FillOrderHandler,
		private readonly v2FillHandler: RaribleV2FillOrderHandler,
		private readonly openSeaFillHandler: OpenSeaFillOrderHandler,
	) {
		this.fill = this.fill.bind(this)
	}

	async fill(request: FillOrderRequest): Promise<FillOrderAction> {
		if (isLegacyRequest(request)) {
			return this.fillInternal(request, this.v1FillHandler)
		} else if (isOrderV2Request(request)) {
			return this.fillInternal(request, this.v2FillHandler)
		} else if (isOpenseaOrderV1Request(request)) {
			return this.fillInternal(request, this.openSeaFillHandler)
		}
		throw new Error(`Unsupported request: ${JSON.stringify(request)}`)
	}

	private async fillInternal<T extends FillOrderRequest>(
		request: T, handler: FillOrderHandler<T>,
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
