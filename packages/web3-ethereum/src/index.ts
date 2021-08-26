import type { Contract, ContractSendMethod } from "web3-eth-contract"
import type { PromiEvent } from "web3-core"
import type { Ethereum, EthereumContract, EthereumFunctionCall, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import { waitForHash } from "./utils/wait-for-hash"
import type { Web3EthereumConfig } from "./domain"
import { waitForConfirmation } from "./utils/wait-for-confirmation"
import { providerRequest } from "./utils/provider-request"

export class Web3Ethereum implements Ethereum {
	constructor(private readonly config: Web3EthereumConfig) {}

	createContract(abi: any, address?: string): EthereumContract {
		return new Web3Contract(this.config, new this.config.web3.eth.Contract(abi, address))
	}

	async send(method: string, params: unknown[]): Promise<any> {
		return providerRequest(this.config.web3.currentProvider, {
			method,
			params
		})
	}

	async personalSign(message: string): Promise<string> {
		const signer = await this.getFrom()
		return (this.config.web3.eth.personal as any).sign(message, signer)
	}

	async getFrom(): Promise<string> {
		if (this.config.from) return this.config.from
		return this.config.web3.eth.getAccounts().then(([first]) => first)
	}
}

export class Web3Contract implements EthereumContract {
	constructor(private readonly config: Web3EthereumConfig, private readonly contract: Contract) {}

	functionCall(name: string, ...args: any): EthereumFunctionCall {
		return new Web3FunctionCall(this.config, this.contract.methods[name].bind(null, ...args))
	}
}

export class Web3FunctionCall implements EthereumFunctionCall {
	constructor(
		private readonly config: Web3EthereumConfig,
		private readonly getSendMethod: () => ContractSendMethod
	) {}

	call(options: EthereumSendOptions = {}): Promise<any> {
		return this.getSendMethod().call({
			from: this.config.from,
			gas: options.gas,
			gasPrice: options.gasPrice?.toString(),
		})
	}

	async send(options: EthereumSendOptions = {}): Promise<EthereumTransaction> {
		const promiEvent: PromiEvent<any> = this.getSendMethod().send({
			from: this.config.from || await this.getFrom(),
			gas: this.config.gas || options.gas,
			value: options.value,
			gasPrice: options.gasPrice?.toString()
		})
		const hash = await waitForHash(promiEvent)
		return new Web3Transaction(hash, promiEvent)
	}

	async getFrom(): Promise<string> {
		const [account] = await this.config.web3.eth.getAccounts()
		return account
	}
}

export class Web3Transaction implements EthereumTransaction {
	constructor(
		public readonly hash: string, 
		private readonly promiEvent: PromiEvent<any>
	) {}

	wait = () => waitForConfirmation(this.promiEvent) 
}
