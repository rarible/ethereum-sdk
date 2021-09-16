import { OrderForm } from "@rarible/protocol-api-client"

export function getBaseOrderFee(order: OrderForm): number {
	if (order.type === "RARIBLE_V1") {
		return 0
	} else if (order.type === "RARIBLE_V2") {
		return 0
	} else {
		throw new Error(`Unsupported order type ${order.type}`)
	}
}
