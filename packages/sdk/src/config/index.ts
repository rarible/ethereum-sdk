import type { EthereumNetwork } from "../types"
import { e2eConfig } from "./e2e"
import { ropstenConfig } from "./ropsten"
import { rinkebyConfig } from "./rinkeby"
import { mainnetConfig } from "./mainnet"
import type { EthereumConfig } from "./type"
import { mumbaiConfig } from "./mumbai"

const configDictionary: Record<EthereumNetwork, EthereumConfig> = {
	e2e: e2eConfig,
	ropsten: ropstenConfig,
	rinkeby: rinkebyConfig,
	mainnet: mainnetConfig,
	mumbai: mumbaiConfig,
}

export function getEthereumConfig(env: EthereumNetwork): EthereumConfig {
	return configDictionary[env]
}
