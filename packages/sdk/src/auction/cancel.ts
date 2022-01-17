import type { BigNumber } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { EthereumConfig } from "../config/type"
import { createEthereumAuctionContract } from "./contracts/auction"

export async function cancelAuction(
	ethereum: Maybe<Ethereum>,
	config: EthereumConfig,
	auctionId: BigNumber
) {
	if (!ethereum) {
		throw new Error("Wallet is undefined")
	}
	return createEthereumAuctionContract(ethereum, config.auction)
		.functionCall("cancel", auctionId)
		.send()
}
