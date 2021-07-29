import { SimpleOrder } from "./sign-order"
import { Address, Binary } from "@rarible/protocol-api-client"
import { toBinary } from "@rarible/types"

const ZERO = toBinary("0x0000000000000000000000000000000000000000000000000000000000000000")
export function invertOrder(order: SimpleOrder, maker: Address, salt: Binary = toBinary(ZERO)): SimpleOrder {
	return {
		...order,
		make: order.take,
		take: order.make,
		maker,
		taker: order.maker,
		salt,
		signature: undefined
	}
}
