import { Contract, ethers } from "ethers"
import type { TransactionResponse } from "@ethersproject/abstract-provider"
import {
	Ethereum,
	EthereumContract,
	EthereumFunctionCall,
	EthereumSendOptions,
	EthereumTransaction,
	EthereumTransactionReceipt,
	signTypedData,
} from "@rarible/ethereum-provider"
import { Address, Binary, toAddress, toBinary, toWord, Word } from "@rarible/types"
import { MessageTypes, TypedMessage } from "@rarible/ethereum-provider/src/domain"
import { TypedDataSigner } from "@ethersproject/abstract-signer"
import { encodeParameters } from "./abi-coder"

export class EthersWeb3ProviderEthereum implements Ethereum {
	constructor(readonly web3Provider: ethers.providers.Web3Provider, readonly from?: string) {
		this.send = this.send.bind(this)
	}

	createContract(abi: any, address?: string): EthereumContract {
		if (!address) {
			throw new Error("No Contract address provided, it's required for EthersEthereum")
		}
		return new EthersContract(new ethers.Contract(address, abi, this.web3Provider.getSigner()))
	}

	send(method: string, params: any): Promise<any> {
		return this.web3Provider.send(method, params)
	}

	personalSign(message: string): Promise<string> {
		return this.web3Provider.getSigner().signMessage(message)
	}

	async signTypedData<T extends MessageTypes>(data: TypedMessage<T>): Promise<string> {
		const signer = await this.getFrom()
		return signTypedData(this.send, signer, data)
	}

	async getFrom(): Promise<string> {
		if (!this.from) {
			const [first] = await this.web3Provider.listAccounts()
			return first
		}
		return this.from
	}

	encodeParameter(type: any, parameter: any): string {
		return encodeParameters([type], [parameter])
	}
}

export class EthersEthereum implements Ethereum {
	constructor(readonly signer: TypedDataSigner & ethers.Signer) {
	}

	createContract(abi: any, address?: string): EthereumContract {
		if (!address) {
			throw new Error("No Contract address provided, it's required for EthersEthereum")
		}
		return new EthersContract(new ethers.Contract(address, abi, this.signer))
	}

	personalSign(message: string): Promise<string> {
		return this.signer.signMessage(message)
	}

	async signTypedData<T extends MessageTypes>(data: TypedMessage<T>): Promise<string> {
		const { EIP712Domain, ...types } = data.types
		return this.signer._signTypedData(data.domain, types, data.message)
	}

	getFrom(): Promise<string> {
		return this.signer.getAddress()
	}

	encodeParameter(type: any, parameter: any): string {
		return encodeParameters([type], [parameter])
	}
}

export class EthersContract implements EthereumContract {
	constructor(private readonly contract: Contract) {
	}

	functionCall(name: string, ...args: any): EthereumFunctionCall {
		return new EthersFunctionCall(this.contract, name, args)
	}
}

export class EthersFunctionCall implements EthereumFunctionCall {
	constructor(
		private readonly contract: Contract,
		private readonly name: string,
		private readonly args: any[],
	) {
	}

	get data(): string {
		return (this.contract.populateTransaction[this.name](...this.args) as any).data
	}

	async estimateGas() {
		const func = this.contract.estimateGas[this.name].bind(null, ...this.args)
		const value = await func()
		return value.toNumber()
	}

	call(options?: EthereumSendOptions): Promise<any> {
		const func = this.contract[this.name].bind(null, ...this.args)
		if (options) {
			return func(options)
		} else {
			return func()
		}
	}

	async send(options?: EthereumSendOptions): Promise<EthereumTransaction> {
		const func = this.contract[this.name].bind(null, ...this.args)
		if (options) {
			return new EthersTransaction(await func(options))
		} else {
			return new EthersTransaction(await func())
		}
	}
}

export class EthersTransaction implements EthereumTransaction {
	constructor(private readonly tx: TransactionResponse) {
	}

	get hash(): Word {
		return toWord(this.tx.hash)
	}

	async wait(): Promise<EthereumTransactionReceipt> {
		const receipt = await this.tx.wait()
		return {
			...receipt,
			status: receipt.status === 1,
			events: (receipt as any).events,
		}
	}

	get to(): Address | undefined {
		return this.tx.to ? toAddress(this.tx.to) : undefined
	}

	get from(): Address {
		return toAddress(this.tx.from)
	}

	get data(): Binary {
		return toBinary(this.tx.data)
	}

	get nonce(): number {
		return this.tx.nonce
	}
}
