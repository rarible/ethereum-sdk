import type { ConfigurationParameters } from "@rarible/ethereum-api-client"

export type EthereumNetwork = "e2e" | "ropsten" | "rinkeby" | "mainnet" | "mumbai" | "mumbai-dev" | "polygon"

export enum LogsLevel {
	DISABLED = 0,
	ERROR = 1,
	TRACE = 2
}

export interface IRaribleEthereumSdkConfig {
	apiClientParams?: ConfigurationParameters
	logs?: LogsLevel
}
