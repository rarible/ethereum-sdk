import { SimpleOrder } from "./sign-order"
import { Address, toBigNumber, toWord, Word } from "@rarible/types"
import BN from "bignumber.js"
import { toBn } from "../common/to-bn"
import { isNft } from "./is-nft"

const ZERO = toWord("0x0000000000000000000000000000000000000000000000000000000000000000")
export function invertOrder(order: SimpleOrder, amount: BN, maker: Address, salt: Word = ZERO): SimpleOrder {
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
