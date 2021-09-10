import type { Address, Binary, Word } from "@rarible/types"
import type { MessageTypes, TypedMessage } from "./domain"
import { signTypedDataInternal } from "./utils"

export interface EthereumTransaction {
	hash: Word
	from: Address
	to?: Address
	data: Binary
	nonce: number
	wait(): Promise<void>
}

export interface EthereumSendOptions {
	value?: number | string
	gas?: number
	gasPrice?: number
}

export interface EthereumFunctionCall {
	call(options?: EthereumSendOptions): Promise<any>
	send(options?: EthereumSendOptions): Promise<EthereumTransaction>
}

export interface EthereumContract {
	functionCall(name: string, ...args: any): EthereumFunctionCall
}

export interface Ethereum {
	createContract(abi: any, address?: string): EthereumContract
	send(method: string, params: any): Promise<any>
	getFrom(): Promise<string>
	personalSign(message: string): Promise<string>
	sha3(string: string): string
	encodeParameter(type: any, parameter: any): string
}

export async function signTypedData<T extends MessageTypes>(ethereum: Ethereum, data: TypedMessage<T>) {
	const signer = await ethereum.getFrom()
	return signTypedDataInternal(signer, ethereum, data)
}
