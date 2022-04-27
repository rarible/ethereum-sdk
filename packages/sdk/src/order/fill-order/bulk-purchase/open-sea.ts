import type { Address } from "@rarible/ethereum-api-client"
import { ZERO_ADDRESS } from "@rarible/types"
import type { OpenSeaOrderDTO } from "../open-sea-types"

export function getAtomicMatchArgAddressesForBulkV2(dto: OpenSeaOrderDTO, openseaWrapper: Address) {
	return [
		dto.exchange,
		openseaWrapper,
		dto.maker,
		ZERO_ADDRESS,
		dto.target,
		dto.staticTarget,
		dto.paymentToken,

		dto.exchange,
		dto.maker,
		dto.taker,
		dto.feeRecipient,
		dto.target,
		dto.staticTarget,
		dto.paymentToken,
	]
}
