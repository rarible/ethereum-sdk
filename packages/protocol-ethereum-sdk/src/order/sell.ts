import type {
	Address,
	Erc20AssetType,
	EthAssetType,
	Order,
	OrderControllerApi,
	OrderForm,
	Part,
} from "@rarible/protocol-api-client"
import { randomWord, toBigNumber } from "@rarible/types"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import { Action } from "@rarible/action"
import type { AssetTypeRequest, AssetTypeResponse } from "./check-asset-type"
import type { UpsertOrder } from "./upsert-order"

export type SellRequest = {
	maker: Address
	makeAssetType: AssetTypeRequest
	amount: number
	takeAssetType: EthAssetType | Erc20AssetType
	price: BigNumberValue
	payouts: Array<Part>
	originFees: Array<Part>
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
				const form = await this.prepareOrderForm(request)
				const checked = await this.upserter.checkLazyOrder(form)
				await this.upserter.approve(checked, false)
				return checked
			},
		})
		.thenStep({
			id: "sign" as const,
			run: (form: OrderForm) => this.upserter.upsertRequest(form),
		})

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

	private async prepareOrderForm(request: SellRequest): Promise<OrderForm> {
		return {
			maker: request.maker,
			make: {
				assetType: await this.checkAssetType(request.makeAssetType),
				value: toBigNumber(request.amount.toString()),
			},
			take: {
				assetType: request.takeAssetType,
				value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
			},
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: request.payouts,
				originFees: request.originFees,
			},
			salt: toBigNumber(toBn(randomWord(), 16).toString(10)),
		}
	}

	private async prepareOrderUpdateForm(order: Order, price: BigNumberValue): Promise<OrderForm> {
		if (order.type === "RARIBLE_V1" || order.type === "RARIBLE_V2") {
			return {
				...order,
				take: {
					assetType: order.take.assetType,
					value: toBigNumber(toBn(price).multipliedBy(order.make.value).toString()),
				},
				salt: toBigNumber(toBn(order.salt, 16).toString(10)),
			}
		}
		throw new Error(`Unsupported order type: ${order.type}`)
	}
}
