import { SimpleOrder } from "./sign-order"

export function getBaseOrderFillFee(order: SimpleOrder): number {
	if (order.type === "RARIBLE_V1") {
		return 0
	} else if (order.type === "RARIBLE_V2") {
		return 0
	} else if (order.type === "OPEN_SEA_V1") {
		return 250 //todo check
	} else {
		//todo add PUNKS
		throw new Error(`Unsupported order ${JSON.stringify(order)}`)
	}
}
