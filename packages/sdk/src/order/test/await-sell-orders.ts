import type { Address, BigNumber } from "@rarible/ethereum-api-client"
import type { RaribleSdk } from "../../index"
import { retry } from "../../common/retry"

export async function awaitSellOrdersByItem(sdk: RaribleSdk, contract: Address, tokenId: BigNumber) {
	await retry(40, 3000, async () => {
		const orders = await sdk.apis.order.getSellOrdersByItem({
			contract,
			tokenId,
		})
		if (!orders.orders.length) {
			throw new Error("Orders has not been found")
		}
		return orders
	})
}
