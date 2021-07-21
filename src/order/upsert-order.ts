// noinspection JSCommentMatchesSignature

import { Address, Asset, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { ActionBuilder } from "@rarible/action"

type UpserOrderStageId = "approve" | "sign" | "post"

/**
 * Updates or inserts the order. Also, calls approve (or setApprovalForAll) if needed, signs order message
 * @param order - order to insert/update
 * @param infinite - pass true if you want to use infinite approval for ERC-20 tokens
 */
export async function upsertOrder(
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string>,
	signOrder: (signer: string, order: OrderForm) => Promise<OrderForm>,
	api: OrderControllerApi,
	order: OrderForm,
	infinite: boolean = false,
) {
	return ActionBuilder.create<UpserOrderStageId>()
		.then({ id: "approve", run: () => approve(order.maker, order.make, infinite) })
		.then({ id: "sign", run: () => signOrder(order.maker, order) })
		.then({ id: "post", run: signed => api.upsertOrder({ orderForm: signed })})
		.build()
}
