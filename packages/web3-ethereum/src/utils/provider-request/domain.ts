import type { JsonRpcPayload, JsonRpcResponse } from "web3-core-helpers"

export type RequestParams = {
	method: string
	params: unknown[] | undefined
}

export type LegacySendMethod = (
	payload: JsonRpcPayload,
	callback: (error: Error | null, result?: JsonRpcResponse | undefined) => void
) => void

export type JsonRpcPayloadReduced = Omit<JsonRpcPayload, "id" | "jsonrpc">

