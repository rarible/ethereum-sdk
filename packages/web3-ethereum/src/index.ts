import type { Contract, ContractSendMethod } from "web3-eth-contract"
import type { PromiEvent } from "web3-core"
import type {
	Ethereum,
	EthereumContract,
	EthereumFunctionCall,
	EthereumSendOptions,
	EthereumTransaction
} from "@rarible/ethereum-provider"
import { Address, Binary, toAddress, toBinary, toWord, Word } from "@rarible/types"
import { waitForHash } from "./utils/wait-for-hash"
import type { Web3EthereumConfig } from "./domain"
import { waitForConfirmation } from "./utils/wait-for-confirmation"
import { providerRequest } from "./utils/provider-request"

export class Web3Ethereum implements Ethereum {
	constructor(private readonly config: Web3EthereumConfig) {
	}

	createContract(abi: any, address?: string): EthereumContract {
		return new Web3Contract(this.config, new this.config.web3.eth.Contract(abi, address))
	}

	async send(method: string, params: unknown[]): Promise<any> {
		return providerRequest(this.config.web3.currentProvider, method, params)
	}

	async personalSign(message: string): Promise<string> {
		const signer = await this.getFrom()
		return (this.config.web3.eth.personal as any).sign(message, signer)
	}

	async getFrom(): Promise<string> {
		if (this.config.from) return this.config.from
		return this.config.web3.eth.getAccounts().then(([first]) => first)
	}

	sha3(string: string): string {
		return this.config.web3.utils.sha3(string)!
	}

	encodeParameter(type: any, parameter: any): string {
		return this.config.web3.eth.abi.encodeParameter(type, parameter)
	}
}

export class Web3Contract implements EthereumContract {
	constructor(private readonly config: Web3EthereumConfig, private readonly contract: Contract) {
	}

	functionCall(name: string, ...args: any): EthereumFunctionCall {
		return new Web3FunctionCall(
			this.config, this.contract.methods[name].bind(null, ...args), toAddress(this.contract.options.address)
		)
	}
}

export class Web3FunctionCall implements EthereumFunctionCall {
	constructor(
		private readonly config: Web3EthereumConfig,
		private readonly getSendMethod: () => ContractSendMethod,
		private readonly contract: Address
	) {
	}

	call(options: EthereumSendOptions = {}): Promise<any> {
		return this.getSendMethod().call({
			from: this.config.from,
			gas: options.gas,
			gasPrice: options.gasPrice?.toString(),
		})
	}

	async send(options: EthereumSendOptions = {}): Promise<EthereumTransaction> {
		const sendMethod = this.getSendMethod()
		const from = toAddress(await this.getFrom())
		const promiEvent: PromiEvent<any> = sendMethod.send({
			from,
			gas: this.config.gas || options.gas,
			value: options.value,
			gasPrice: options.gasPrice?.toString(),
		})
		const hash = await waitForHash(promiEvent)
		const tx = await this.config.web3.eth.getTransaction(hash)
		return new Web3Transaction(
			promiEvent,
			toWord(hash),
			toBinary(sendMethod.encodeABI()),
			tx.nonce,
			from,
			this.contract
		)
	}

	async getFrom(): Promise<string> {
		if (this.config.from) {
			return this.config.from
		}
		const [first] = await this.config.web3.eth.getAccounts()
		return first
	}
}

export class Web3Transaction implements EthereumTransaction {
	constructor(
		private readonly promiEvent: PromiEvent<any>,
		public readonly hash: Word,
		public readonly data: Binary,
		public readonly nonce: number,
		public readonly from: Address,
		public readonly to?: Address
	) {
	}

	wait = () => waitForConfirmation(this.promiEvent)
}
