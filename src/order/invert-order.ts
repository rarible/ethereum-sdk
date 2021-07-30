import { SimpleOrder } from "./sign-order"
import { Address, AssetType, Binary } from "@rarible/protocol-api-client"
import { toBigNumber, toBinary } from "@rarible/types"
import BN from "bignumber.js"
import { toBn } from "../common/to-bn"

const ZERO = toBinary("0x0000000000000000000000000000000000000000000000000000000000000000")
export function invertOrder(order: SimpleOrder, amount: BN, maker: Address, salt: Binary = toBinary(ZERO)): SimpleOrder {
	const [makeValue, takeValue] = calculateAmounts(toBn(order.make.value), toBn(order.take.value), amount, isNft(order.take.assetType))
	return {
		...order,
		make: {
			...order.take,
			value: toBigNumber(makeValue.toString())
		},
		take: {
			...order.make,
			value: toBigNumber(takeValue.toString())
		},
		maker,
		taker: order.maker,
		salt,
		signature: undefined
	}
}

function isNft(assetType: AssetType) {
	return assetType.assetClass === "ERC1155"
		|| assetType.assetClass === "ERC721"
		|| assetType.assetClass === "ERC1155_LAZY"
		|| assetType.assetClass === "ERC721_LAZY"
}

function calculateAmounts(
	make: BN,
	take: BN,
	amount: BN,
	bid: boolean
): [BN, BN] {
	if (bid) {
		return [amount, amount.multipliedBy(make).div(take)]
	} else {
		return [amount.multipliedBy(take).div(make), amount]
}
}
