import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { EthereumConfig } from "../config/type"

/**
 * Check the wallet chainId is the same as in the config
 * @param ethereum Wallet
 * @param config EthereumConfig
 */
export async function checkChainId(ethereum: Maybe<Ethereum>, config: EthereumConfig): Promise<boolean> {
	if (!ethereum) {
		throw new Error("Wallet is undefined")
	}
	const networkId = await ethereum.getChainId()
	if (config.chainId !== networkId) {
		throw new Error(`Config chainId=${config.chainId}, but wallet chainId=${networkId}`)
	}
	return true
}
