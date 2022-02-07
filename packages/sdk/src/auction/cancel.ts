import type { BigNumber } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { EthereumConfig } from "../config/type"
import type { SendFunction } from "../common/send-transaction"
import { checkChainId } from "../order/check-chain-id"
import { createEthereumAuctionContract } from "./contracts/auction"

export async function cancelAuction(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	config: EthereumConfig,
	auctionId: BigNumber
) {
	if (!ethereum) {
		throw new Error("Wallet is undefined")
	}
	await checkChainId(ethereum, config)
	return send(
		createEthereumAuctionContract(ethereum, config.auction)
			.functionCall("cancel", auctionId)
	)
}
