import type { EthereumProviderError, EthereumRpcError } from "eth-rpc-errors"

export type ProviderRequestError = {
	type: "rpc",
	reason: EthereumRpcError<any>	
} | {
	type: "provider"
	reason: EthereumProviderError<any>	
}