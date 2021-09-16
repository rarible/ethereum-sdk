import { TypedDataUtils } from "eth-sig-util"
import { MessageTypes, SignTypedDataMethodEnum, TypedMessage } from "./domain"
import type { Ethereum } from "."

export async function signTypedDataInternal<T extends MessageTypes>(
	ethereum: Ethereum, data: TypedMessage<T>,
): Promise<string> {
	const signer = await ethereum.getFrom()
	try {
		return await ethereum.send(SignTypedDataMethodEnum.V4, [signer, JSON.stringify(data)])
	} catch (error) {
		console.error("got error white executing sign typed data v4", error)
		if ("message" in error && error.message === "MetaMask Message Signature: Error: Not supported on this device") {
			return signWithHardwareWallets(ethereum, data)
		} else {
			filterErrors(error)
			try {
				return await ethereum.send(SignTypedDataMethodEnum.V3, [signer, JSON.stringify(data)])
			} catch (error) {
				console.error("got error white executing sign typed data v3", error)
				filterErrors(error)
				return ethereum.send(SignTypedDataMethodEnum.DEFAULT, [signer, data])
			}
		}
	}
}

async function signWithHardwareWallets<T extends MessageTypes>(ethereum: Ethereum, data: TypedMessage<T>) {
	const hash = TypedDataUtils.sign(data)
	const signature = toBuffer(await ethereum.ethSign(`0x${hash.toString("hex")}`))
	signature.writeInt8(signature[64] + 4, 64)
	return `0x${signature.toString("hex")}`
}

/*
	4900 - wallet is disconnected
	4001 - user cancelled request
	4901 - chain is not connected
	4100 - not authorized in wallet
*/

function filterErrors(original: unknown) {
	if (hasCode(original)) {
		if ([4900, 4001, 4901, 4100].includes(original.code)) {
			throw original
		}
	}
}

function hasCode(error: unknown): error is { code: number } {
	return typeof error === "object" && error !== null && "code" in error
}

function toBuffer(hex: string) {
	if (hex.startsWith("0x")) {
		return Buffer.from(hex.substring(2), "hex")
	} else {
		return Buffer.from(hex, "hex")
	}
}
