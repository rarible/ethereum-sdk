import { Contract, ethers } from "ethers"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider"

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

export const DOMAIN_TYPE = [
	{ type: "string", name: "name" },
	{ type: "string", name: "version" },
	{ type: "uint256", name: "chainId" },
	{ type: "address", name: "verifyingContract" },
]

