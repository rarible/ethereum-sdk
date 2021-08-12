import { toAddress } from "@rarible/types/build/address"
import { toBigNumber } from "@rarible/types/build/big-number"
import { toBinary } from "@rarible/types"
import { SimpleOrder } from "../sign-order"
import { toBn } from "../../common/to-bn"

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
	salt: toBinary(toBn(10).toString(16)),
}
