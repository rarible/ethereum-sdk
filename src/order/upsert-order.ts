// noinspection JSCommentMatchesSignature

import { Address, Asset, Binary, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { ActionBuilder } from "@rarible/action"
import { SimpleOrder } from "./sign-order"
import { toBn } from "../common/to-bn"
import { toBinary } from "@rarible/types"

type UpserOrderStageId = "approve" | "sign" | "post"

/**
 * Updates or inserts the order. Also, calls approve (or setApprovalForAll) if needed, signs order message
 * @param order - order to insert/update
 * @param infinite - pass true if you want to use infinite approval for ERC-20 tokens
 */
export async function upsertOrder(
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string>,
	signOrder: (order: SimpleOrder) => Promise<Binary>,
	api: OrderControllerApi,
	order: OrderForm,
	infinite: boolean = false,
) {
	return ActionBuilder.create<UpserOrderStageId>()
		.then({ id: "approve", run: () => approve(order.maker, order.make, infinite) })
		.then({ id: "sign", run: () => signOrder(orderFormToSimpleOrder(order)) })
		.then({ id: "post", run: signature => api.upsertOrder({ orderForm: { ...order, signature } })})
		.build()
}

function orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
	return {
		...form,
		salt: toBinary(toBn(form.salt).toString(16))
	}
}
