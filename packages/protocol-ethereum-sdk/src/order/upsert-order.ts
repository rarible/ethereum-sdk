// noinspection JSCommentMatchesSignature

import { Binary, Order, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { Action, Execution } from "@rarible/action"
import { toBinary } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type { SimpleOrder } from "./types"
import { addFee } from "./add-fee"
import type { ApproveFunction } from "./approve"
import { OrderFiller } from "./fill-order"

export type UpsertOrderStageId = "approve" | "sign"
export type UpsertOrderActionArg = {order: OrderForm, infinite?: boolean}
export type UpsertOrderAction = Action<UpsertOrderActionArg, UpsertOrderStageId, Order>
export type UpsertOrderExecution = Execution<UpsertOrderActionArg, UpsertOrderStageId, Order>
export type UpsertOrderFunction = (order: OrderForm, infinite?: boolean) => Promise<UpsertOrderAction>

export class UpsertOrder {
	constructor(
		private readonly orderFiller: OrderFiller,
		public readonly checkLazyOrder: (form: OrderForm) => Promise<OrderForm>,
		private readonly approveFn: ApproveFunction,
		private readonly signOrder: (order: SimpleOrder) => Promise<Binary>,
		private readonly orderApi: OrderControllerApi,
	) {}

	upsert: UpsertOrderAction = Action
		.create({
			id: "approve" as const,
			run: async ({ order, infinite }: UpsertOrderActionArg) => {
				const checkedOrder = await this.checkLazyOrder(order)
				await this.approve(checkedOrder, infinite)
				return checkedOrder
			},
		})
		.thenStage({
			id: "sign" as const,
			run: async (checkedOrder: OrderForm) => {
				return this.upsertRequest(checkedOrder)
			},
		})

	upsertFn(order: OrderForm, infinite?: (boolean | undefined)): UpsertOrderExecution {
		return this.upsert.build({ order, infinite })
	}

	async approve(checkedOrder: OrderForm, infinite: boolean = false) {
		const fee = await this.orderFiller.getOrderFee(UpsertOrder.orderFormToSimpleOrder(checkedOrder))
		const make = addFee(checkedOrder.make, fee)
		await this.approveFn(checkedOrder.maker, make, infinite)
	}

	async upsertRequest(checkedOrder: OrderForm) {
		return this.orderApi.upsertOrder({
			orderForm: {
				...checkedOrder,
				signature: await this.signOrder(UpsertOrder.orderFormToSimpleOrder(checkedOrder)),
			},
		})
	}

	static orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
		return {
			...form,
			salt: toBinary(toBn(form.salt).toString(16)) as any,
		}
	}
}
