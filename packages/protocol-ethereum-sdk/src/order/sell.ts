import type {
	Address,
	Erc20AssetType,
	EthAssetType,
	Order,
	OrderForm,
	Part,
} from "@rarible/protocol-api-client"
import { randomWord, toBigNumber, Word } from "@rarible/types"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import { Action } from "@rarible/action"
import type { AssetTypeRequest, AssetTypeResponse } from "./check-asset-type"
import { UpsertOrder } from "./upsert-order"

export type SellRequest = {
	maker: Address
	makeAssetType: AssetTypeRequest
	amount: number
	takeAssetType: EthAssetType | Erc20AssetType
	price: BigNumberValue
	payouts: Array<Part>
	originFees: Array<Part>
	salt?: Word
}

export type SellOrderAction = Action<SellOrderStageId, SellRequest, Order>
export type SellOrderStageId = "approve" | "sign"

export class OrderSell {
	constructor(
		private readonly upserter: UpsertOrder,
		private readonly checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
	) {}

	sell: SellOrderAction = Action
		.create({
			id: "approve" as const,
			run: async (request: SellRequest) => {
				const orderForm = await this.prepareOrderForm(request)
				const checkedOrder = await this.upserter.checkLazyOrder(orderForm)
				await this.upserter.approve(checkedOrder, false)
				return checkedOrder
			},
		})
		.thenStep({
			id: "sign" as const,
			run: async (checkedOrder: OrderForm) => this.upserter.upsertRequest(checkedOrder),
		})

	private async prepareOrderForm(request: SellRequest): Promise<OrderForm> {
		const salt = request.salt ?? randomWord()
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
			salt: toBigNumber(toBn(salt, 16).toString(10)) as any,
		}
	}
}
