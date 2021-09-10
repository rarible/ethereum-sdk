import { Address, Binary, Word } from "@rarible/types"
import { SignTypedDataMethodEnum, TypedSignatureData } from "./domain"

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


export async function signTypedData(ethereum: Ethereum, data: TypedSignatureData) {
	const signer = await ethereum.getFrom()
	try {
		return await ethereum.send(SignTypedDataMethodEnum.V4, [signer, JSON.stringify(data)])
	} catch (error) {
		try {
			return await ethereum.send(SignTypedDataMethodEnum.V3, [signer, JSON.stringify(data)])
		} catch (error) {
			return await ethereum.send(SignTypedDataMethodEnum.DEFAULT, [signer, data])
		}
	}
}
