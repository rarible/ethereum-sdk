import type { Address, BigNumber, Binary, Word } from "@rarible/types"
import type { MessageTypes, TypedMessage } from "./domain"
export * from "./domain"

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

export interface EthereumFunctionCallInfo {
	method: string
	args: any[]
	from?: string
}

export interface EthereumFunctionCall {
	data: string
	getCallInfo(): Promise<EthereumFunctionCallInfo>
	estimateGas(): Promise<number>
	call(options?: EthereumSendOptions): Promise<any>
	send(options?: EthereumSendOptions): Promise<EthereumTransaction>
}

export interface EthereumContract {
	functionCall(name: string, ...args: any): EthereumFunctionCall
}

export interface Ethereum {
	createContract(abi: any, address?: string): EthereumContract
	getFrom(): Promise<string>
	personalSign(message: string): Promise<string>
	signTypedData<T extends MessageTypes>(data: TypedMessage<T>): Promise<string>
	encodeParameter(type: any, parameter: any): string
	getBalance(address: Address): Promise<BigNumber>
	getChainId(): Promise<number>
}

export { signTypedData } from "./sign-typed-data"
