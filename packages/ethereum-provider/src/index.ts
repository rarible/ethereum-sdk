import { SignTypedDataMethodEnum, TypedSignatureData } from "./domain"

export interface Ethereum {
	createContract(abi: any, address?: string): EthereumContract

	send(method: string, params: any): Promise<any>

	getFrom(): Promise<string>

	personalSign(message: string): Promise<string>
}

export interface EthereumContract {
	functionCall(name: string, ...args: any): EthereumFunctionCall
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

export interface EthereumTransaction {
	hash: string

	wait(): Promise<void>
}

export async function signTypedData(ethereum: Ethereum, data: TypedSignatureData) {
	const signer = await ethereum.getFrom()
	try {
		return await ethereum.send(SignTypedDataMethodEnum.V4, [signer, JSON.stringify(data)])
	} catch (error) {
		try {
			return await ethereum.send(SignTypedDataMethodEnum.V3, [signer, JSON.stringify(data)])
		} catch (error) {
			return ethereum.send(SignTypedDataMethodEnum.DEFAULT, [signer, data])
		}
	}
}
