import type { AuctionControllerApi } from "@rarible/ethereum-api-client"
import { retry } from "../../common/retry"

export async function awaitForAuction(auctionApi: AuctionControllerApi, auctionHash: string) {
	return retry(60, 1000, async () => {
		return auctionApi.getAuctionByHash({ hash: auctionHash })
	})
}
