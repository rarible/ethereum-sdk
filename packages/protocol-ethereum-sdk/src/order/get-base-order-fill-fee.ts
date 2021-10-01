import { toBn } from "@rarible/utils"
import { SimpleOrder } from "./sign-order"

export async function getBaseOrderFillFee(order: SimpleOrder) {
	if (order.type === "RARIBLE_V1") {
		return 0
	} else if (order.type === "RARIBLE_V2") {
		return 0
	} else if (order.type === "OPEN_SEA_V1") {

		if (order.data.side === "SELL") {

			const fees = toBn(order.data.takerProtocolFee)
				.plus(order.data.takerRelayerFee)

			return +toBn(order.take.value)
				.multipliedBy(fees)

		} else if (order.data.side === "BUY") {

			const fees = toBn(order.data.makerProtocolFee)
				.plus(order.data.makerRelayerFee)

			return +toBn(order.make.value)
				.multipliedBy(fees)

		}

		return 0
	} else {
		//todo add PUNKS
		throw new Error(`Unsupported order ${JSON.stringify(order)}`)
	}
}
