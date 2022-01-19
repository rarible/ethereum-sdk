import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import { toAddress, toBigNumber } from "@rarible/types"
import type { Part } from "@rarible/ethereum-api-client"
import type { AuctionControllerApi } from "@rarible/ethereum-api-client"

import { Action } from "@rarible/action"
import type { Auction } from "@rarible/ethereum-api-client/build/models"
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
	auctionId: BigNumber
	payouts: Part[]
	originFees: Part[]
}
export type BuyoutAuctionAction = Action<"approve" | "sign", BuyOutRequest, EthereumTransaction>

export class BuyoutAuction {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly config: EthereumConfig,
		private readonly approve: ApproveFunction,
		private readonly auctionApi: AuctionControllerApi,
	) {}

	readonly buyout: BuyoutAuctionAction = Action.create({
		id: "approve" as const,
		run: async (request: BuyOutRequest) => {
			if (!this.ethereum) {
				throw new Error("Wallet is undefined")
			}
			const auctionHash = getAuctionHash(this.ethereum, this.config, request.auctionId)
			const auction = await this.auctionApi.getAuctionByHash({ hash: auctionHash })
			if (auction.data.buyOutPrice === undefined) {
				throw new Error("Buy out is unavailable for current auction")
			}
			const buyoutPrice = toBigNumber((await getPrice(this.ethereum, auction.buy, auction.data.buyOutPrice)).toString())

			if (auction.buy.assetClass !== "ETH") {
				await waitTx(
					this.approve(
						toAddress(await this.ethereum.getFrom()),
						{assetType: auction.buy, value: buyoutPrice },
						true
					)
				)
			}

			return { request, auction, price: buyoutPrice }
		},
	})
		.thenStep({
			id: "sign" as const,
			run: async ({ request, auction, price }: { request: BuyOutRequest, auction: Auction, price: BigNumber}) => {
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
					.functionCall("buyOut", request.auctionId, bid)
					.send(options)
			},
		})
}
