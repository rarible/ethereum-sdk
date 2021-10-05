import { toBn } from "@rarible/utils"
import { SimpleOrder } from "./types"

export async function getBaseOrderFillFee(order: SimpleOrder) {
	if (order.type === "RARIBLE_V1") {
		return 0
	} else if (order.type === "RARIBLE_V2") {
		return 0
	} else if (order.type === "OPEN_SEA_V1") {

		if (order.data.side === "SELL") {

			return toBn(order.data.takerProtocolFee)
				.plus(order.data.takerRelayerFee)
				.toNumber()

		} else if (order.data.side === "BUY") {

			return toBn(order.data.makerProtocolFee)
				.plus(order.data.makerRelayerFee)
				.toNumber()

		}

		throw new Error("order should be BUY or SELL")
	} else {
		//todo add PUNKS
		throw new Error(`Unsupported order ${JSON.stringify(order)}`)
	}
}
