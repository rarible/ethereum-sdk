import type { ConfigurationParameters } from "@rarible/ethereum-api-client"
import type { Word } from "@rarible/types"

export type EthereumNetwork =
  | "testnet"
  | "mainnet"
  | "mumbai"
  | "polygon"
  | "dev-ethereum"
  | "dev-polygon"

export enum LogsLevel {
	DISABLED = 0,
	ERROR = 1,
	TRACE = 2
}

export interface IRaribleEthereumSdkConfig {
	apiClientParams?: ConfigurationParameters
	logs?: LogsLevel
	ethereum?: EthereumNetworkConfig
	polygon?: EthereumNetworkConfig
}

export interface EthereumNetworkConfig {
	openseaOrdersMetadata?: Word
}
