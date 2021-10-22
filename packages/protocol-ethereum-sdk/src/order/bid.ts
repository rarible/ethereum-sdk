import {
	Address,
	OrderForm,
	Part,
	EthAssetType,
	Erc20AssetType,
	Order,
} from "@rarible/protocol-api-client"
import { randomWord, toBigNumber, Word } from "@rarible/types"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import { Action } from "@rarible/action"
import { UpsertOrder } from "./upsert-order"
import { AssetTypeRequest, AssetTypeResponse } from "./check-asset-type"

export type BidRequest = {
	maker: Address
	makeAssetType: EthAssetType | Erc20AssetType
	amount: number
	takeAssetType: AssetTypeRequest
	price: BigNumberValue
	payouts: Array<Part>
	originFees: Array<Part>
	salt?: Word
}

export type BidOrderAction = Action<BidOrderOrderStageId, BidRequest, Order>
export type BidOrderOrderStageId = "approve" | "sign"

export class OrderBid {
	constructor(
		private readonly upserter: UpsertOrder,
		private readonly checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
	) {}

	bid: BidOrderAction = Action
		.create({
			id: "approve" as const,
			run: async (request: BidRequest) => {
				const orderForm = await this.prepareOrderForm(request)
				const checkedOrder = await this.upserter.checkLazyOrder(orderForm)
				await this.upserter.approve(checkedOrder, true)
				return checkedOrder
			},
		})
		.thenStep({
			id: "sign" as const,
			run: async (checkedOrder: OrderForm) => this.upserter.upsertRequest(checkedOrder),
		})

	private async prepareOrderForm(request: BidRequest): Promise<OrderForm> {
		const salt = request.salt ?? randomWord()
		console.log("salt is", salt)
		return {
			maker: request.maker,
			make: {
				assetType: request.makeAssetType,
				value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
			},
			take: {
				assetType: await this.checkAssetType(request.takeAssetType),
				value: toBigNumber(`${request.amount}`),
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
