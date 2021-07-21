import { Address, Asset, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { ActionBuilder } from "@rarible/action"

type UpserOrderStageId = "approve" | "sign" | "post"

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
