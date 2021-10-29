// noinspection JSCommentMatchesSignature

import {
	Binary, Erc20AssetType, EthAssetType,
	Order,
	OrderControllerApi,
	OrderForm,
	Part,
	RaribleV2OrderForm,
} from "@rarible/ethereum-api-client"
import { Action } from "@rarible/action"
import { Address, randomWord, toBigNumber, toBinary, Word } from "@rarible/types"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import { Ethereum } from "@rarible/ethereum-provider"
import type { SimpleOrder } from "./types"
import { addFee } from "./add-fee"
import type { ApproveFunction } from "./approve"
import type { OrderFiller } from "./fill-order"
import type { CheckLazyOrderPart } from "./check-lazy-order"
import { createErc20Contract } from "./contracts/erc20"
import { UpsertSimpleOrder } from "./types"

export type UpsertOrderStageId = "approve" | "sign"
export type UpsertOrderActionArg = {
	order: OrderForm
	infinite?: boolean
}
export type UpsertOrderAction = Action<UpsertOrderStageId, UpsertOrderActionArg, Order>

export type HasOrder = { orderHash: Word } | { order: SimpleOrder }
export type HasPrice = { price: BigNumberValue } | { priceDecimal: BigNumberValue }

export type OrderRequest = {
	maker: Address
	payouts: Part[]
	originFees: Part[]
}

export class UpsertOrder {
	constructor(
		private readonly orderFiller: OrderFiller,
		public readonly checkLazyOrder: <T extends CheckLazyOrderPart>(form: T) => Promise<T>,
		private readonly approveFn: ApproveFunction,
		private readonly signOrder: (order: SimpleOrder) => Promise<Binary>,
		private readonly orderApi: OrderControllerApi,
		private readonly ethereum: Ethereum
	) {}

	readonly upsert = Action
		.create({
			id: "approve" as const,
			run: async ({ order, infinite }: UpsertOrderActionArg) => {
				const checkedOrder = await this.checkLazyOrder(order)
				await this.approve(checkedOrder, infinite)
				return checkedOrder
			},
		})
		.thenStep({
			id: "sign" as const,
			run: (checked: OrderForm) => this.upsertRequest(checked),
		})

	async getOrder(hasOrder: HasOrder): Promise<SimpleOrder> {
		if ("order" in hasOrder) {
			return hasOrder.order
		} else {
			return this.orderApi.getOrderByHash({ hash: hasOrder.orderHash })
		}
	}

	async getPrice(hasPrice: HasPrice, assetType: Erc20AssetType | EthAssetType): Promise<BigNumberValue> {
		if ("price" in hasPrice) {
			return hasPrice.price
		} else {
			switch (assetType.assetClass) {
				case "ETH":
					return toBn(hasPrice.priceDecimal).multipliedBy(toBn(10).pow(18))
				case "ERC20":
					const decimals = await createErc20Contract(this.ethereum, assetType.contract)
						.functionCall("decimals")
						.call()
					return toBn(hasPrice.priceDecimal).multipliedBy(toBn(10).pow(Number(decimals)))
				default:
					throw new Error(`Not a currency: ${JSON.stringify(assetType)}`)
			}
		}
	}

	async approve(checkedOrder: OrderForm, infinite: boolean = false) {
		const simple = UpsertOrder.orderFormToSimpleOrder(checkedOrder)
		const fee = await this.orderFiller.getOrderFee(simple)
		const make = addFee(checkedOrder.make, fee)
		await this.approveFn(checkedOrder.maker, make, infinite)
	}

	async upsertRequest(checked: OrderForm): Promise<Order> {
		const simple = UpsertOrder.orderFormToSimpleOrder(checked)
		return this.orderApi.upsertOrder({
			orderForm: {
				...checked,
				signature: await this.signOrder(simple),
			},
		})
	}

	prepareOrderForm(request: OrderRequest): Omit<RaribleV2OrderForm, "take" | "make"> {
		return {
			maker: request.maker,
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: request.payouts,
				originFees: request.originFees,
			},
			salt: toBigNumber(toBn(randomWord(), 16).toString(10)),
		}
	}

	static orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
		return {
			...form,
			salt: toBinary(toBn(form.salt).toString(16)) as any,
		}
	}

	getOrderFormFromOrder<T extends UpsertSimpleOrder>(order: T, make: T["make"], take: T["take"]): OrderForm {
		return {
			...order,
			make,
			take,
			salt: toBigNumber(toBn(order.salt, 16).toString(10)),
		}
	}
}
