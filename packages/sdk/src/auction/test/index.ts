import type { AuctionControllerApi } from "@rarible/ethereum-api-client"
import type { Ethereum } from "@rarible/ethereum-provider"
import { toAddress, toBigNumber } from "@rarible/types"
import type { AssetType } from "@rarible/ethereum-api-client"
import { retry } from "../../common/retry"
import type { EthereumConfig } from "../../config/type"
import type { ApproveFunction } from "../../order/approve"
import { AUCTION_BID_DATA_V1, AUCTION_DATA_TYPE, getAuctionOperationOptions } from "../common"
import { waitTx } from "../../common/wait-tx"
import { createEthereumAuctionContract } from "../contracts/auction"
import { getPrice } from "../../common/get-price"
import type { PutBidRequest } from "../common/put-bid-request.type"

export async function awaitForAuction(auctionApi: AuctionControllerApi, auctionHash: string) {
	return retry(60, 1000, async () => {
		return auctionApi.getAuctionByHash({ hash: auctionHash })
	})
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
