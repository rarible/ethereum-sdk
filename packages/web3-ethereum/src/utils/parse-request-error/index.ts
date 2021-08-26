import { EthereumRpcError, EthereumProviderError } from "eth-rpc-errors"
import { ProviderRequestError } from "./domain"

export function parseRequestError(error: any): ProviderRequestError | undefined {
	if (typeof error === "object" && "code" in error) {
		if (error.code <= -32000 && error.code >= -33000) {
			return {
				type: "rpc",
				reason: new EthereumRpcError(error.code, error.message, error.data)
			}
		}
		if (error.code >= 4000 && error.code <= 5000) {
			return {
				type: "provider",
				reason: new EthereumProviderError(error.code, error.message, error.data)
			}
		}
	}
	return undefined
}
