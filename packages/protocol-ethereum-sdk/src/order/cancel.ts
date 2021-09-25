import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address } from "@rarible/protocol-api-client"
import { ExchangeAddresses } from "../config/type"
import { orderToStruct, SimpleLegacyOrder, SimpleOrder, SimpleRaribleV2Order } from "./sign-order"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { toStructLegacyOrderKey } from "./to-struct-legacy-order"
import { createExchangeV2Contract } from "./contracts/exchange-v2"

export async function cancel(
	ethereum: Ethereum,
	config: ExchangeAddresses,
	order: SimpleOrder,
): Promise<EthereumTransaction> {
	switch (order.type) {
		case "RARIBLE_V1":
			return cancelLegacyOrder(ethereum, config.v1, order)
		case "RARIBLE_V2":
			return cancelV2Order(ethereum, config.v2, order)
		case "OPEN_SEA_V1":
			//todo implement for opensea + test
			throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		default:
			throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
	}
}

async function cancelLegacyOrder(ethereum: Ethereum, contract: Address, order: SimpleLegacyOrder) {
	const v1 = createExchangeV1Contract(ethereum, contract)
	return v1.functionCall("cancel", toStructLegacyOrderKey(order)).send()
}

async function cancelV2Order(ethereum: Ethereum, contract: Address, order: SimpleRaribleV2Order) {
	const v2 = createExchangeV2Contract(ethereum, contract)
	return v2.functionCall("cancel", orderToStruct(ethereum, order)).send()
}
