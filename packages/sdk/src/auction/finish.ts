import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import type { AuctionControllerApi } from "@rarible/ethereum-api-client"
import type { EthereumConfig } from "../config/type"
import type { SendFunction } from "../common/send-transaction"
import { checkChainId } from "../order/check-chain-id"
import type { RaribleEthereumApis } from "../common/apis"
import { createEthereumAuctionContract } from "./contracts/auction"

export async function finishAuction(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	config: EthereumConfig,
	apis: RaribleEthereumApis,
	hash: string,
) {
	if (!ethereum) {
		throw new Error("Wallet is undefined")
	}
	const auction = await apis.auction.getAuctionByHash({ hash })

	if (!auction.lastBid) {
		throw new Error("Auction without bid can't be finished")
	}

	return send(
		createEthereumAuctionContract(ethereum, config.auction)
			.functionCall("finishAuction", auction.auctionId)
	)
}
