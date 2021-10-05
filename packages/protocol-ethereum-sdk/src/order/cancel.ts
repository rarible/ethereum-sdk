import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address } from "@rarible/protocol-api-client"
import { ExchangeAddresses } from "../config/type"
import { toVrs } from "../common/to-vrs"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { createOpenseaContract } from "./contracts/exchange-opensea-v1"
import { toStructLegacyOrderKey } from "./fill-order/rarible-v1"
import { getAtomicMatchArgAddresses, getAtomicMatchArgUints } from "./fill-order/open-sea"
import { SimpleLegacyOrder, SimpleOpenSeaV1Order, SimpleOrder, SimpleRaribleV2Order } from "./types"
import { orderToStruct } from "./sign-order"
import { convertOpenSeaOrderToDTO } from "./fill-order/open-sea-converter"

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
			return cancelOpenseaOrderV1(ethereum, config.openseaV1, order)
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

export function cancelOpenseaOrderV1(ethereum: Ethereum, contract: Address, order: SimpleOpenSeaV1Order) {
	const exchangeContract = createOpenseaContract(ethereum, contract)

	const dto = convertOpenSeaOrderToDTO(ethereum, order)
	const makerVRS = toVrs(order.signature || "0x")

	return exchangeContract.functionCall(
		"cancelOrder_",
		getAtomicMatchArgAddresses(dto),
		getAtomicMatchArgUints(dto),
		dto.feeMethod,
		dto.side,
		dto.saleKind,
		dto.howToCall,
		dto.calldata,
		dto.replacementPattern,
		dto.staticExtradata,
		makerVRS.v,
		makerVRS.r,
		makerVRS.s,
	)
		.send()
}
