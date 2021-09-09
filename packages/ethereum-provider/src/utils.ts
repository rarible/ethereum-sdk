import { SignTypedDataMethodEnum, MessageTypes, TypedMessage } from "./domain"
import type { Ethereum } from "."

export async function signTypedDataInternal<T extends MessageTypes>(
	signer: string, ethereum: Ethereum, data: TypedMessage<T>
): Promise<string> {
	try {
		return await ethereum.send(SignTypedDataMethodEnum.V4, [signer, JSON.stringify(data)])
	} catch (error) {
		filterErrors(error)
		try {
			return await ethereum.send(SignTypedDataMethodEnum.V3, [signer, JSON.stringify(data)])
		} catch (error) {
			filterErrors(error)
			return ethereum.send(SignTypedDataMethodEnum.DEFAULT, [signer, data])
		}
	}
}

/*
	4900 - wallet is disconnected
	4001 - user cancelled request
	4901 - chain is not connected
	4100 - not authorized in wallet
*/

function filterErrors(original: unknown) {
	if (hasCode(original)) {
		if ([4900, 4001, 4901, 4100].includes(original.code))  {
			throw original
		}
	}
}

function hasCode(error: unknown): error is { code: number } {
	return typeof error === "object" && error !== null && "code" in error
}