import type { Erc20AssetType, EthAssetType, Order, OrderControllerApi, OrderForm, RaribleV2OrderForm } from "@rarible/protocol-api-client"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import { Action } from "@rarible/action"
import { toBigNumber } from "@rarible/types"
import type { OrderRequest, UpsertOrder } from "./upsert-order"
import { AssetTypeRequest, AssetTypeResponse } from "./check-asset-type"

export type SellRequest = OrderRequest & {
	makeAssetType: AssetTypeRequest
	amount: number
	takeAssetType: EthAssetType | Erc20AssetType
	price: BigNumberValue
}
export type SellOrderStageId = "approve" | "sign"
export type SellOrderAction = Action<SellOrderStageId, SellRequest, Order>

export type SellUpdateRequest = {
	orderHash: string
	price: BigNumberValue
}

export type SellOrderUpdateAction = Action<SellOrderStageId, SellUpdateRequest, Order>

export class OrderSell {
	constructor(
		private readonly upserter: UpsertOrder,
		private readonly checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
		private readonly orderApi: OrderControllerApi
	) {}

	readonly sell: SellOrderAction = Action
		.create({
			id: "approve" as const,
			run: async (request: SellRequest) => {
				const form = await this.getSellForm(request)
				const checked = await this.upserter.checkLazyOrder(form)
				await this.upserter.approve(checked, false)
				return checked
			},
		})
		.thenStep({
			id: "sign" as const,
			run: (form: OrderForm) => this.upserter.upsertRequest(form),
		})

	private async getSellForm(request: SellRequest): Promise<RaribleV2OrderForm> {
		const form = this.upserter.prepareOrderForm(request)
		return {
			...form,
			make: {
				assetType: await this.checkAssetType(request.makeAssetType),
				value: toBigNumber(request.amount.toString()),
			},
			take: {
				assetType: request.takeAssetType,
				value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
			},
		}
	}

	readonly update: SellOrderUpdateAction = Action
		.create({
			id: "approve" as const,
			run: async ({ orderHash, price}: SellUpdateRequest) => {
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

	async prepareOrderUpdateForm(order: Order, price: BigNumberValue): Promise<OrderForm> {
		if (order.type === "RARIBLE_V1" || order.type === "RARIBLE_V2") {
			return this.upserter.getOrderFormFromOrder(order, order.make, {
				assetType: order.take.assetType,
				value: toBigNumber(toBn(price).multipliedBy(order.make.value).toString()),
			})
		}
		throw new Error(`Unsupported order type: ${order.type}`)
	}
}
