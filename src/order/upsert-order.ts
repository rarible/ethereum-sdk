// noinspection JSCommentMatchesSignature

import {
	Address,
	Asset,
	Binary,
	NftItemControllerApi,
	Order,
	OrderControllerApi,
	OrderForm
} from "@rarible/protocol-api-client"
import { Action, ActionBuilder } from "@rarible/action"
import { SimpleOrder } from "./sign-order"
import { toBn } from "../common/to-bn"
import { toBinary } from "@rarible/types"
import {checkLazyOrder} from "./check-lazy-order";
import {checkLazyAsset} from "./check-lazy-asset";
import {checkLazyAssetType} from "./check-lazy-asset-type";

export type UpserOrderStageId = "checkLazyOrder" | "approve" | "sign" | "post"

export type UpsertOrderFunction = (order: OrderForm, infinite?: boolean) => Promise<Action<UpserOrderStageId, [OrderForm, string | undefined, Binary, Order]>>

/**
 * Updates or inserts the order. Also, calls approve (or setApprovalForAll) if needed, signs order message
 * @param order - order to insert/update
 * @param infinite - pass true if you want to use infinite approval for ERC-20 tokens
 */
export async function upsertOrder(
	checkLazyOrder: (form: OrderForm) => Promise<OrderForm>,
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string | undefined>,
	signOrder: (order: SimpleOrder) => Promise<Binary>,
	orderApi: OrderControllerApi,
	order: OrderForm,
	infinite: boolean = false,
) {

	return ActionBuilder.create<UpserOrderStageId>()
		.then({ id: "checkLazyOrder", run: () => checkLazyOrder(order)})
		.then({ id: "approve", run: checkedOrder => approve(checkedOrder.maker, checkedOrder.make, infinite) })
		.then({ id: "sign", run: () => signOrder(orderFormToSimpleOrder(order)) })
		.then({ id: "post", run: signature => orderApi.upsertOrder({ orderForm: { ...order, signature } })})
		.build()
}

function orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
	return {
		...form,
		salt: toBinary(toBn(form.salt).toString(16))
	}
}
