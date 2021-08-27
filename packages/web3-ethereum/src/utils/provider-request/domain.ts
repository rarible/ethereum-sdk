import type { JsonRpcPayload } from "web3-core-helpers"

export type RequestParams = {
	method: string
	params: unknown[] | undefined
}

export type JsonRpcPayloadReduced = Omit<JsonRpcPayload, "id" | "jsonrpc">
