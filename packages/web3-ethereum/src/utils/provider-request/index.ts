import type { JsonRpcPayloadReduced, LegacySendMethod, RequestParams } from "./domain"

export async function providerRequest(provider: any, config: RequestParams): Promise<any> {
    if ("request" in provider && typeof provider.request === "function") {
        return provider.request(config)
    } else {
        return requestLegacy(provider, requestParamsToRpcRequest(config))
    }
}

function getSendLegacy(provider: any): LegacySendMethod {
    return (...args) => {
        if (provider !== null && typeof provider === "object") {
            if ("sendAsync" in provider && typeof provider.sendAsync === "function") {
                return provider.sendAsync.call(provider, ...args)
            }
            if ("send" in provider && typeof provider.send === "function") {
                return provider.send.call(provider, ...args)
            }
        }
        throw new Error("No send method defined")
    }
}

function requestLegacy(provider: any, payload: JsonRpcPayloadReduced): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        try {
            const legacySend = getSendLegacy(provider)
            return legacySend({
                jsonrpc: "2.0",
                id: new Date().getTime(),
                ...payload,
            }, (error, result) => {
                const err = error || result?.error
                if (err) {
                    return reject(err)
                }
                if (result?.result) {
                    return resolve(result.result)
                }
                return reject(new Error("Can't handle JSON-RPC request"))
            })
        } catch (error) {
            return reject(error)
        }
    })
}

export function requestParamsToRpcRequest(config: RequestParams): JsonRpcPayloadReduced {
	if (!config.params) {
		throw new Error("Unconvertable request payload")
	}
	return {
		params: config.params,
		method: config.method,
	}
}
