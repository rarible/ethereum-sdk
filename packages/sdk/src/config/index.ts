import type { EthereumNetwork } from "../types"
import { e2eConfig } from "./e2e"
import { ropstenConfig } from "./ropsten"
import { rinkebyConfig } from "./rinkeby"
import { mainnetConfig } from "./mainnet"
import type { EthereumConfig } from "./type"
import { mumbaiConfig } from "./mumbai"
import { polygonConfig } from "./polygon"
import { mumbaiDevConfig } from "./mumbai-dev"
import { devEthereumConfig } from "./dev"
import { devPolygonConfig } from "./polygon-dev"
import { testnetEthereumConfig } from "./testnet"

export const configDictionary: Record<EthereumNetwork, EthereumConfig> = {
	ropsten: ropstenConfig,
	rinkeby: rinkebyConfig,
	mainnet: mainnetConfig,
	mumbai: mumbaiConfig,
	"mumbai-dev": mumbaiDevConfig,
	polygon: polygonConfig,
	"dev-ethereum": devEthereumConfig,
	"dev-polygon": devPolygonConfig,
	testnet: testnetEthereumConfig,
}

export function getEthereumConfig(env: EthereumNetwork): EthereumConfig {
	return configDictionary[env]
}
