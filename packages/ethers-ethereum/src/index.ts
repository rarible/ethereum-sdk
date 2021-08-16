import { Contract, ethers } from "ethers"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import {
	Ethereum,
	EthereumContract,
	EthereumFunctionCall,
	EthereumSendOptions,
	EthereumTransaction,
} from "@rarible/ethereum-provider"

export class EthersEthereum implements Ethereum {
	constructor(readonly web3Provider: ethers.providers.Web3Provider, readonly from?: string) {
	}

	createContract(abi: any, address?: string): EthereumContract {
		return new EthersContract(new ethers.Contract(address!, abi, this.web3Provider.getSigner()))
	}

	async send(method: string, params: any): Promise<any> {
		return await this.web3Provider.send(method, params)
	}

	personalSign(message: string): Promise<string> {
		return this.web3Provider.getSigner().signMessage(message)
	}

	async getFrom(): Promise<string> {
		if (this.from) {
			return this.from
		}
		return this.web3Provider.listAccounts().then(xs => xs[0])
	}
}

export class EthersContract implements EthereumContract {
	constructor(private readonly contract: Contract) {
	}

	functionCall(name: string, ...args: any): EthereumFunctionCall {
		return new EthersFunctionCall(this.contract, this.contract.methods[name].bind(null, ...args))
	}

}

export class EthersFunctionCall implements EthereumFunctionCall {
	constructor(private readonly contract: Contract, private readonly func: any) {
	}

	call(options: EthereumSendOptions): Promise<any> {
		return this.func(options)
	}

	async send(options: EthereumSendOptions): Promise<EthereumTransaction> {
		const tx: TransactionResponse = await this.func(options)
		return new EthersTransaction(tx)
	}
}

export class EthersTransaction implements EthereumTransaction {
	constructor(private readonly tx: TransactionResponse) {
	}

	get hash(): string {
		return this.tx.hash!
	}

	async wait(): Promise<void> {
		await this.tx.wait()
	}
}


