import type { OrderForm, Order, OrderControllerApi, Erc20AssetType, EthAssetType, RaribleV2OrderForm } from "@rarible/protocol-api-client"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import { Action } from "@rarible/action"
import { toBigNumber } from "@rarible/types"
import type { OrderRequest, UpsertOrder } from "./upsert-order"
import type { AssetTypeRequest, AssetTypeResponse } from "./check-asset-type"

export type BidRequest = OrderRequest & {
	makeAssetType: EthAssetType | Erc20AssetType
	amount: number
	takeAssetType: AssetTypeRequest
	price: BigNumberValue
}
export type BidOrderOrderStageId = "approve" | "sign"
export type BidOrderAction = Action<BidOrderOrderStageId, BidRequest, Order>

export type BidUpdateRequest = {
	orderHash: string
	price: BigNumberValue
}

export type BidUpdateOrderAction = Action<BidOrderOrderStageId, BidUpdateRequest, Order>

export class OrderBid {
	constructor(
		private readonly upserter: UpsertOrder,
		private readonly checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
		private readonly orderApi: OrderControllerApi
	) {}

	readonly bid: BidOrderAction = Action
		.create({
			id: "approve" as const,
			run: async (request: BidRequest) => {
				const form = await this.getBidForm(request)
				const checked = await this.upserter.checkLazyOrder(form)
				await this.upserter.approve(checked, true)
				return checked
			},
		})
		.thenStep({
			id: "sign" as const,
			run: (checked: OrderForm) => this.upserter.upsertRequest(checked),
		})

	readonly update: BidUpdateOrderAction = Action
		.create({
			id: "approve" as const,
			run: async ({ orderHash, price }: BidUpdateRequest) => {
				const order = await this.orderApi.getOrderByHash({ hash: orderHash })
				const form = await this.prepareOrderUpdateForm(order, price)
				const checked = await this.upserter.checkLazyOrder(form)
				await this.upserter.approve(checked, false)
				return checked
			},
		})
		.thenStep({
			id: "sign" as const,
			run: (form: OrderForm) => this.upserter.upsertRequest(form),
		})

	private async getBidForm(request: BidRequest): Promise<RaribleV2OrderForm> {
		const form = this.upserter.prepareOrderForm(request)
		return {
			...form,
			make: {
				assetType: request.makeAssetType,
				value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
			},
			take: {
				assetType: await this.checkAssetType(request.takeAssetType),
				value: toBigNumber(request.amount.toString()),
			},
		}
	}

	async prepareOrderUpdateForm(order: Order, price: BigNumberValue): Promise<OrderForm> {
		if (order.type === "RARIBLE_V1" || order.type === "RARIBLE_V2") {
			return this.upserter.getOrderFormFromOrder(order, {
				assetType: order.make.assetType,
				value: toBigNumber(toBn(price).multipliedBy(order.take.value).toString()),
			}, order.take)
		}
		throw new Error(`Unsupported order type: ${order.type}`)
	}
}
