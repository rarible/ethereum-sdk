// noinspection JSCommentMatchesSignature

import { Binary, Order, OrderControllerApi, OrderForm, Word } from "@rarible/protocol-api-client"
import { ActionBuilder } from "@rarible/action"
import { toBinary } from "@rarible/types"
import { EthereumTransaction } from "@rarible/ethereum-provider"
import { toBn } from "../common/to-bn"
import { SimpleOrder } from "./sign-order"
import { addFee } from "./add-fee"
import { GetMakeFeeFunction } from "./get-make-fee"
import { ApproveFunction } from "./approve"

export type UpsertOrderStageId = "approve" | "sign" | "post"

export type UpsertOrderAction = ActionBuilder<UpsertOrderStageId, void, [(EthereumTransaction | undefined), Binary, Order]>

export type UpsertOrderFunction = (order: OrderForm, infinite?: boolean) => Promise<UpsertOrderAction>

/**
 * Updates or inserts the order. Also, calls approve (or setApprovalForAll) if needed, signs order message
 * @param order - order to insert/update
 * @param infinite - pass true if you want to use infinite approval for ERC-20 tokens
 */
export async function upsertOrder(
	getMakeFee: GetMakeFeeFunction,
	checkLazyOrder: (form: OrderForm) => Promise<OrderForm>,
	approve: ApproveFunction,
	signOrder: (order: SimpleOrder) => Promise<Binary>,
	orderApi: OrderControllerApi,
	order: OrderForm,
	infinite: boolean = false,
): Promise<UpsertOrderAction> {
	const checkedOrder = await checkLazyOrder(order)
	const makeFee = getMakeFee(orderFormToSimpleOrder(checkedOrder))
	const make = addFee(checkedOrder.make, makeFee)
	return Promise.resolve(
		ActionBuilder
			.create({ id: "approve" as const, run: () => approve(checkedOrder.maker, make, infinite) })
			.thenStage({ id: "sign" as const, run: () => signOrder(orderFormToSimpleOrder(checkedOrder)) })
			.thenStage({
				id: "post" as const,
				run: sig => orderApi.upsertOrder({ orderForm: { ...checkedOrder, signature: sig } }),
			}),
	)
}

function orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
	return {
		...form,
		// @ts-ignore
		salt: toBinary(toBn(form.salt).toString(16)) as Word,
	}
}
