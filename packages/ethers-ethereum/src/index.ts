import { Contract, ethers } from "ethers"
import type { TransactionResponse } from "@ethersproject/abstract-provider"
import {
	Ethereum,
	EthereumContract,
	EthereumFunctionCall,
	EthereumSendOptions,
	EthereumTransaction,
} from "@rarible/ethereum-provider"

export class EthersEthereum implements Ethereum {
	constructor(readonly web3Provider: ethers.providers.Web3Provider, readonly from?: string) {}

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

	async getFrom(): Promise<string> {
		if (!this.from) {
			const [first] = await this.web3Provider.listAccounts()
			return first
		}
		return this.from
	}
}

export class EthersContract implements EthereumContract {
	constructor(private readonly contract: Contract) {}

	functionCall(name: string, ...args: any): EthereumFunctionCall {
		return new EthersFunctionCall(this.contract.methods[name].bind(null, ...args))
	}
}

export class EthersFunctionCall implements EthereumFunctionCall {
	constructor(private readonly func: (options: EthereumSendOptions) => Promise<TransactionResponse>) {}

	call(options: EthereumSendOptions): Promise<any> {
		return this.func(options)
	}

	async send(options: EthereumSendOptions): Promise<EthereumTransaction> {
		return new EthersTransaction(await this.func(options))
	}
}

export class EthersTransaction implements EthereumTransaction {
	constructor(private readonly tx: TransactionResponse) {}

	get hash(): string {
		return this.tx.hash
	}

	async wait(): Promise<void> {
		await this.tx.wait()
	}
}
