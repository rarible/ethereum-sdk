import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import type { EthereumConfig } from "../config/type"
import { createEthereumAuctionContract } from "./contracts/auction"

export async function finishAuction(
	ethereum: Maybe<Ethereum>,
	config: EthereumConfig,
	auctionId: BigNumber
) {
	if (!ethereum) {
		throw new Error("Wallet is undefined")
	}
	return createEthereumAuctionContract(ethereum, config.auction)
		.functionCall("finishAuction", auctionId)
		.send()
}
