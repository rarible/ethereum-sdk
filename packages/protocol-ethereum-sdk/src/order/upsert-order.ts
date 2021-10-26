// noinspection JSCommentMatchesSignature

import { Binary, Order, OrderControllerApi, OrderForm, Part, RaribleV2OrderForm } from "@rarible/protocol-api-client"
import { Action, Execution } from "@rarible/action"
import { Address, randomWord, toBigNumber, toBinary } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type { SimpleOrder } from "./types"
import { addFee } from "./add-fee"
import type { ApproveFunction } from "./approve"
import type { OrderFiller } from "./fill-order"
import type { CheckLazyOrderPart } from "./check-lazy-order"

export type UpsertOrderStageId = "approve" | "sign"
export type UpsertOrderActionArg = {
	order: OrderForm
	infinite?: boolean
}
export type UpsertOrderAction = Action<UpsertOrderStageId, UpsertOrderActionArg, Order>
export type UpsertOrderExecution = Execution<UpsertOrderStageId, Order>
export type UpsertOrderFunction = (order: OrderForm, infinite?: boolean) => Promise<UpsertOrderAction>

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

	getOrderFormFromOrder<T extends Order>(order: T, make: T["make"], take: T["take"]): OrderForm {
		return {
			...order,
			make,
			take,
			salt: toBigNumber(toBn(order.salt, 16).toString(10)),
		}
	}
}
