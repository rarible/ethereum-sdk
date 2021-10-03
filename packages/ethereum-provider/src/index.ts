import type { Address, Binary, Word } from "@rarible/types"
import type { MessageTypes, TypedMessage } from "./domain"
import { signTypedDataInternal } from "./utils"

export type EthereumTransactionEvent = {
	event: string,
	address: string
	args: any
	logIndex: number
	transactionIndex: number
	transactionHash: string
	blockHash: string
}

export type EthereumTransactionReceipt = {
	to: string
	from: string
	contractAddress?: string
	status: boolean
	transactionIndex: number
	transactionHash: string
	blockHash: string
	blockNumber: number
	events: EthereumTransactionEvent[]
}

export interface EthereumTransaction {
	hash: Word
	from: Address
	to?: Address
	data: Binary
	nonce: number
	wait(): Promise<EthereumTransactionReceipt>
}

export interface EthereumSendOptions {
	value?: number | string
	gas?: number
	gasPrice?: number
}

export interface EthereumFunctionCall {
	data: string
	estimateGas(): Promise<number>
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
	ethSign(message: string): Promise<string>
	encodeParameter(type: any, parameter: any): string
}

export async function signTypedData<T extends MessageTypes>(ethereum: Ethereum, data: TypedMessage<T>) {
	return signTypedDataInternal(ethereum, data)
}
