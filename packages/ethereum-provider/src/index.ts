import { Address, Binary, Word } from "@rarible/types"
import { BigNumber } from "ethers"
import { SignTypedDataMethodEnum, TypedSignatureData } from "./domain"

export interface EthereumTransaction {
	hash: Word

	from: Address

	to?: Address

	data: Binary

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

	sha3(string: string): string | null

	encodeParameter(type: any, parameter: any): string

	getTransaction(hash: string): Promise<GetTransactionResponse>
}

export interface GetTransactionResponse {
	hash: string
	nonce: number
	blockHash?: string | null
	blockNumber?: number | null
	transactionIndex?: number | null
	from: string
	to?: string | null // - String: Address of the receiver. null if it’s a contract creation transaction.
	value: BigNumber | string
	gasPrice?: BigNumber | string
	gas?: number
	input?: string

	accessList?: AccessListItem[],
	chainId?: number,
	confirmations?: number,
	creates?: string
	data?: string
	gasLimit?: BigNumber,
	v?: number,
	r?: string
	s?: string
	type?: number | null,
	wait?: Function
}

export type AccessListItem = {
	address: string
	storageKeys: string[]
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
