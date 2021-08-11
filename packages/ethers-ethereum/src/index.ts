import { Contract, ethers } from "ethers"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider"

export class EthersEthereum implements Ethereum {
	constructor(readonly web3Provider: ethers.providers.Web3Provider) {
	}

	createContract(abi: any, address?: string): EthereumContract {
		return new EthersContract(new ethers.Contract(address!, abi, this.web3Provider.getSigner()))
	}

	async send(method: string, params: any): Promise<any> {
		const [signer] = await this.getAccounts()
		return await this.web3Provider.send(method, [signer, params])
	}

	async getAccounts(): Promise<string[]> {
		return await this.web3Provider.listAccounts()
	}
}

export class EthersContract implements EthereumContract {
	constructor(private readonly contract: Contract) {
	}

	call(name: string, ...args: any): Promise<any> {
		return this.contract[name](...args)
	}

	async send(name: string, ...args: any): Promise<EthereumTransaction> {
		const tx: TransactionResponse = await this.contract[name](...args)
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
