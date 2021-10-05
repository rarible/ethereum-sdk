import { OrderForm } from "@rarible/protocol-api-client"
import { Config } from "../config/type"

export async function getBaseOrderFee(config: Config, type: OrderForm["type"]) {
	switch (type) {
		case "RARIBLE_V1":
			return 0
		case "RARIBLE_V2":
			return 0
		default:
			throw new Error(`Unsupported order type ${type}`)
	}
}
