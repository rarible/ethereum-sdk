import { toAddress } from "@rarible/types/build/address"
import { toBigNumber } from "@rarible/types/build/big-number"
import { toWord } from "@rarible/types"
import { SimpleOrder } from "../sign-order"

export const TEST_ORDER_TEMPLATE: Omit<SimpleOrder, "type" | "data"> = {
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
	salt: toWord("0x000000000000000000000000000000000000000000000000000000000000000a"),
}
