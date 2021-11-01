import { OrderForm } from "@rarible/ethereum-api-client"
import { Config } from "../config/type"
import { CURRENT_ORDER_TYPE_VERSION } from "../common/order"

export async function getBaseOrderFee(config: Config, type: OrderForm["type"] = CURRENT_ORDER_TYPE_VERSION) {
	switch (type) {
		case "RARIBLE_V1":
			return 0
		case "RARIBLE_V2":
			return 0
		default:
			throw new Error(`Unsupported order type ${type}`)
	}
}
