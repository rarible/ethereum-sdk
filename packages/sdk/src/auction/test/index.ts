import type { AuctionControllerApi } from "@rarible/ethereum-api-client"
import type { Ethereum } from "@rarible/ethereum-provider"
import { toAddress, toBigNumber } from "@rarible/types"
import type { AssetType } from "@rarible/ethereum-api-client"
import { retry } from "../../common/retry"
import type { EthereumConfig } from "../../config/type"
import type { ApproveFunction } from "../../order/approve"
import type { PutBidRequest } from "../put-bid"
import { AUCTION_BID_DATA_V1, AUCTION_DATA_TYPE, getAuctionOperationOptions, getPrice } from "../common"
import { waitTx } from "../../common/wait-tx"
import { createEthereumAuctionContract } from "../contracts/auction"

export async function awaitForAuction(auctionApi: AuctionControllerApi, auctionHash: string) {
	return retry(60, 1000, async () => {
		return auctionApi.getAuctionByHash({ hash: auctionHash })
	})
}

export async function testPutBid(
	ethereum: Ethereum,
	config: EthereumConfig,
	approve: ApproveFunction,
	assetType: AssetType,
	request: PutBidRequest
) {
	const price = toBigNumber((await getPrice(ethereum, assetType, request.priceDecimal)).toString())

	if (assetType.assetClass !== "ETH") {
		await waitTx(
			approve(
				toAddress(await ethereum.getFrom()),
				{
					assetType: assetType,
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
	const options = getAuctionOperationOptions(assetType, price)

	return createEthereumAuctionContract(ethereum, config.auction)
		.functionCall("putBid", request.auctionId, bid)
		.send(options)
}

export function increaseTime(web3: any, duration: number) {
	const id = Date.now()
	return new Promise((resolve, reject) => {
		web3.currentProvider.send({
			jsonrpc: "2.0",
			method: "evm_increaseTime",
			params: [duration],
			id: id,
		}, (err1: any) => {
			if (err1) return reject(err1)

			web3.currentProvider.send({
				jsonrpc: "2.0",
				method: "evm_mine",
				id: id+1,
			}, (err2: any, res: any) => {
				return err2 ? reject(err2) : resolve(res)
			})
		})
	})
}
