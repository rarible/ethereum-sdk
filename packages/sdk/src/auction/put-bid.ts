import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import type { Part } from "@rarible/ethereum-api-client"
import { toAddress, toBigNumber } from "@rarible/types"
import type { AuctionControllerApi } from "@rarible/ethereum-api-client"
import type { EthereumConfig } from "../config/type"
import type { ApproveFunction } from "../order/approve"
import { waitTx } from "../common/wait-tx"
import { createEthereumAuctionContract } from "./contracts/auction"
import { AUCTION_BID_DATA_V1, AUCTION_DATA_TYPE, getAuctionHash, getAuctionOperationOptions, getPrice } from "./common"

export type PutBidRequest = {
	priceDecimal: BigNumber,
	payouts: Part[],
	originFees: Part[],
}

export async function putBid(
	ethereum: Maybe<Ethereum>,
	config: EthereumConfig,
	approve: ApproveFunction,
	auctionApi: AuctionControllerApi,
	auctionId: BigNumber,
	request: PutBidRequest
) {
	if (!ethereum) {
		throw new Error("Wallet is undefined")
	}
	const auctionHash = getAuctionHash(ethereum, config, auctionId)
	const auction = await auctionApi.getAuctionByHash({ hash: auctionHash })

	const price = toBigNumber((await getPrice(ethereum, auction.buy, request.priceDecimal)).toString())

	if (auction.buy.assetClass !== "ETH") {
		await waitTx(
			approve(
				toAddress(await ethereum.getFrom()),
				{
					assetType: auction.buy,
					value: price,
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
		amount: price,
		dataType: AUCTION_DATA_TYPE,
		data: bidData,
	}
	const options = getAuctionOperationOptions(auction.buy, price)

	return createEthereumAuctionContract(ethereum, config.auction)
		.functionCall("putBid", auctionId, bid)
		.send(options)
}
