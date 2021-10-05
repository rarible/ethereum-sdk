// noinspection JSCommentMatchesSignature

import { Binary, Order, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { ActionBuilder } from "@rarible/action"
import { toBinary } from "@rarible/types"
import type { EthereumTransaction } from "@rarible/ethereum-provider"
import { toBn } from "@rarible/utils/build/bn"
import type { SimpleOrder } from "./types"
import { addFee } from "./add-fee"
import type { ApproveFunction } from "./approve"
import { OrderFiller } from "./fill-order"

export type UpsertOrderStageId = "approve" | "sign"
export type UpsertOrderAction = ActionBuilder<UpsertOrderStageId, void, [EthereumTransaction | undefined, Order]>
export type UpsertOrderFunction = (order: OrderForm, infinite?: boolean) => Promise<UpsertOrderAction>

/**
 * Updates or inserts the order. Also, calls approve (or setApprovalForAll) if needed, signs order message
 * @param order - order to insert/update
 * @param infinite - pass true if you want to use infinite approval for ERC-20 tokens
 */
export async function upsertOrder(
	orderFiller: OrderFiller,
	checkLazyOrder: (form: OrderForm) => Promise<OrderForm>,
	approve: ApproveFunction,
	signOrder: (order: SimpleOrder) => Promise<Binary>,
	orderApi: OrderControllerApi,
	order: OrderForm,
	infinite: boolean = false
): Promise<UpsertOrderAction> {
	const checkedOrder = await checkLazyOrder(order)
	const fee = await orderFiller.getOrderFee(orderFormToSimpleOrder(checkedOrder))
	const make = addFee(checkedOrder.make, fee)
	return ActionBuilder
		.create({
			id: "approve" as const,
			run: () => approve(checkedOrder.maker, make, infinite),
		})
		.thenStage({
			id: "sign" as const,
			run: async () => orderApi.upsertOrder({
				orderForm: {
					...checkedOrder,
					signature: await signOrder(orderFormToSimpleOrder(checkedOrder)),
				},
			}),
		})
}

function orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
	return {
		...form,
		salt: toBinary(toBn(form.salt).toString(16)) as any,
	}
}
