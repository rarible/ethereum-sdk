import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import type { Part } from "@rarible/ethereum-api-client"
import { toAddress, toBigNumber } from "@rarible/types"
import type { AuctionControllerApi } from "@rarible/ethereum-api-client"
import { Action } from "@rarible/action"
import type { EthereumTransaction } from "@rarible/ethereum-provider"
import type { Auction } from "@rarible/ethereum-api-client/build/models"
import type { EthereumConfig } from "../config/type"
import type { ApproveFunction } from "../order/approve"
import { waitTx } from "../common/wait-tx"
import { getPrice } from "../common/get-price"
import { createEthereumAuctionContract } from "./contracts/auction"
import { AUCTION_BID_DATA_V1, AUCTION_DATA_TYPE, getAuctionHash, getAuctionOperationOptions } from "./common"

export type PutBidRequest = {
	auctionId: BigNumber
	priceDecimal: BigNumber
	payouts: Part[]
	originFees: Part[]
}

export type PutAuctionBidAction = Action<"approve" | "sign", PutBidRequest, EthereumTransaction>

export class PutAuctionBid {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly config: EthereumConfig,
		private readonly approve: ApproveFunction,
		private readonly auctionApi: AuctionControllerApi,
	) {}

	readonly putBid: PutAuctionBidAction = Action.create({
		id: "approve" as const,
		run: async (request: PutBidRequest) => {
			if (!this.ethereum) {
				throw new Error("Wallet is undefined")
			}
			const auctionHash = getAuctionHash(this.ethereum, this.config, request.auctionId)
			const auction = await this.auctionApi.getAuctionByHash({ hash: auctionHash })
			const price = toBigNumber((await getPrice(this.ethereum, auction.buy, request.priceDecimal)).toString())

			if (auction.buy.assetClass !== "ETH") {
				await waitTx(
					this.approve(
						toAddress(await this.ethereum.getFrom()),
						{assetType: auction.buy, value: price},
						true
					)
				)
			}
			return { request, auction, price }
		},
	})
		.thenStep({
			id: "sign" as const,
			run: async ({ request, auction, price }: { request: PutBidRequest, auction: Auction, price: BigNumber}) => {
				if (!this.ethereum) {
					throw new Error("Wallet is undefined")
				}
				const bidData = this.ethereum.encodeParameter(AUCTION_BID_DATA_V1, {
					payouts: request.payouts,
					originFees: request.originFees,
				})
				const bid = {
					amount: price,
					dataType: AUCTION_DATA_TYPE,
					data: bidData,
				}
				const options = getAuctionOperationOptions(auction.buy, price)

				return createEthereumAuctionContract(this.ethereum, this.config.auction)
					.functionCall("putBid", request.auctionId, bid)
					.send(options)
			},
		})
}
