import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import { toAddress, toBigNumber } from "@rarible/types"
import type { Part } from "@rarible/ethereum-api-client"
import type { AuctionControllerApi } from "@rarible/ethereum-api-client"

import type { EthereumConfig } from "../config/type"
import type { ApproveFunction } from "../order/approve"
import { waitTx } from "../common/wait-tx"
import { createEthereumAuctionContract } from "./contracts/auction"
import {
	AUCTION_BID_DATA_V1,
	AUCTION_DATA_TYPE,
	getAuctionHash,
	getAuctionOperationOptions, getPrice,
} from "./common"

export type BuyOutRequest = {
	payouts: Part[],
	originFees: Part[],
}
export async function buyOut(
	ethereum: Maybe<Ethereum>,
	config: EthereumConfig,
	approve: ApproveFunction,
	auctionApi: AuctionControllerApi,
	auctionId: BigNumber,
	request: BuyOutRequest
) {
	if (!ethereum) {
		throw new Error("Wallet is undefined")
	}
	const auctionHash = getAuctionHash(ethereum, config, auctionId)
	const auction = await auctionApi.getAuctionByHash({ hash: auctionHash })

	if (auction.data.buyOutPrice === undefined) {
		throw new Error("Buy out is unavailable for current auction")
	}

	const buyoutPrice = toBigNumber((await getPrice(ethereum, auction.buy, auction.data.buyOutPrice)).toString())

	if (auction.buy.assetClass !== "ETH") {
		await waitTx(
			approve(
				toAddress(await ethereum.getFrom()),
				{
					assetType: auction.buy,
					value: buyoutPrice,
				},
				true
			)
		)
	}
	const bidData = ethereum.encodeParameter(AUCTION_BID_DATA_V1, {
		payouts: request.payouts,
		originFees: request.originFees,
	})
	const bid = {
		amount: buyoutPrice,
		dataType: AUCTION_DATA_TYPE,
		data: bidData,
	}

	const options = getAuctionOperationOptions(auction.buy, buyoutPrice)

	return createEthereumAuctionContract(ethereum, config.auction)
		.functionCall("buyOut", auctionId, bid)
		.send(options)

}
