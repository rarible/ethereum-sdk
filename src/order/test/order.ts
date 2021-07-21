import { OrderForm } from "@rarible/protocol-api-client"
import { toAddress } from "@rarible/types/build/address"
import { toBigNumber } from "@rarible/types/build/big-number"

export const TEST_ORDER_TEMPLATE: Omit<OrderForm, "type" | "data"> = {
	make: {
		assetType: {
			assetClass: "ERC721",
			contract: toAddress("0x0000000000000000000000000000000000000001"),
			tokenId: toBigNumber("10"),
		},
		value: toBigNumber("10"),
	},
	maker: toAddress("0x0000000000000000000000000000000000000002"),
	take: {
		assetType: {
			assetClass: "ERC721",
			contract: toAddress("0x0000000000000000000000000000000000000001"),
			tokenId: toBigNumber("10"),
		},
		value: toBigNumber("10"),
	},
	salt: toBigNumber("10"),
}
