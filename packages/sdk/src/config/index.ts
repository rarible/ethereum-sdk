import type { EthereumNetwork } from "../types"
import { mainnetConfig } from "./mainnet"
import type { EthereumConfig } from "./type"
import { mumbaiConfig } from "./mumbai"
import { polygonConfig } from "./polygon"
import { devEthereumConfig } from "./dev"
import { devPolygonConfig } from "./polygon-dev"
import { testnetEthereumConfig } from "./testnet"

export const configDictionary: Record<EthereumNetwork, EthereumConfig> = {
	mainnet: mainnetConfig,
	mumbai: mumbaiConfig,
	polygon: polygonConfig,
	"dev-ethereum": devEthereumConfig,
	"dev-polygon": devPolygonConfig,
	testnet: testnetEthereumConfig,
}

export function getEthereumConfig(env: EthereumNetwork): EthereumConfig {
	return configDictionary[env]
}
