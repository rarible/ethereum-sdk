import { SimpleOrder } from "./sign-order"

export async function getBaseOrderFillFee(order: SimpleOrder) {
	if (order.type === "RARIBLE_V1") {
		return 0
	} else if (order.type === "RARIBLE_V2") {
		return 0
	} else if (order.type === "OPEN_SEA_V1") {
		return
	} else {
		//todo add PUNKS
		throw new Error(`Unsupported order ${JSON.stringify(order)}`)
	}
}
