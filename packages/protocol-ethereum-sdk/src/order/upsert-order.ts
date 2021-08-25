// noinspection JSCommentMatchesSignature

import { Address, Asset, Binary, Order, OrderControllerApi, OrderForm, Word } from "@rarible/protocol-api-client"
import { Action, ActionBuilder } from "@rarible/action"
import { toBinary } from "@rarible/types"
import { toBn } from "../common/to-bn"
import { SimpleOrder } from "./sign-order"
import { addFee } from "./add-fee"
import { GetMakeFeeFunction } from "./get-make-fee"

export type UpsertOrderStageId = "approve" | "sign" | "post"

export type UpsertOrderFunction = (order: OrderForm, infinite?: boolean) => Promise<Action<UpsertOrderStageId, [string | undefined, Binary, Order]>>

/**
 * Updates or inserts the order. Also, calls approve (or setApprovalForAll) if needed, signs order message
 * @param order - order to insert/update
 * @param infinite - pass true if you want to use infinite approval for ERC-20 tokens
 */
export async function upsertOrder(
	getMakeFee: GetMakeFeeFunction,
	checkLazyOrder: (form: OrderForm) => Promise<OrderForm>,
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string | undefined>,
	signOrder: (order: SimpleOrder) => Promise<Binary>,
	orderApi: OrderControllerApi,
	order: OrderForm,
	infinite: boolean = false,
) {
	const checkedOrder = await checkLazyOrder(order)
	const makeFee = getMakeFee(orderFormToSimpleOrder(checkedOrder))
	const make = addFee(checkedOrder.make, makeFee)
	return ActionBuilder.create<UpsertOrderStageId>()
		.then({ id: "approve", run: () => approve(checkedOrder.maker, make, infinite) })
		.then({ id: "sign", run: () => signOrder(orderFormToSimpleOrder(checkedOrder)) })
		.then({ id: "post", run: signature => orderApi.upsertOrder({ orderForm: { ...checkedOrder, signature } }) })
		.build()
}

function orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
	return {
		...form,
		// @ts-ignore
		salt: toBinary(toBn(form.salt).toString(16)) as Word,
	}
}
