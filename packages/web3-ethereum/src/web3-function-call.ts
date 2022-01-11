import type * as EthereumProvider from "@rarible/ethereum-provider"
import { backOff } from "exponential-backoff"
import type { Contract, ContractSendMethod } from "web3-eth-contract"
import type { PromiEvent } from "web3-core"
import { toAddress, toBinary, toWord } from "@rarible/types"
import type { Web3ContractConfig } from "./domain"
import { toPromises } from "./utils/to-promises"
import { Web3Transaction } from "./web3-transaction"
import { getFrom } from "./utils/get-from"

export class Web3FunctionCall implements EthereumProvider.EthereumFunctionCall {
	constructor(
		protected readonly config: Web3ContractConfig,
		protected readonly sendMethod: ContractSendMethod,
		protected readonly contract: Contract
	) {}

	get data(): string {
		return this.sendMethod.encodeABI()
	}

	estimateGas() {
		return this.sendMethod.estimateGas()
	}

	call(options: EthereumProvider.EthereumSendOptions = {}): Promise<any> {
		return this.sendMethod.call({
			from: this.config.from,
			gas: options.gas,
			gasPrice: options.gasPrice?.toString(),
		})
	}

	 async send(options: EthereumProvider.EthereumSendOptions = {}): Promise<EthereumProvider.EthereumTransaction> {
		const from = toAddress(await this.getFrom())
		const promiEvent: PromiEvent<Contract> = this.sendMethod.send({
			from,
			gas: this.config.gas || options.gas,
			value: options.value,
			gasPrice: options.gasPrice?.toString(),
		})
		const { hash, receipt } = toPromises(promiEvent)
		const hashValue = await hash
		const tx = await this.getTransaction(hashValue)
		return new Web3Transaction(
			receipt,
			toWord(hashValue),
			toBinary(this.data),
			tx.nonce,
			from,
			toAddress(this.contract.options.address)
		)
	}

	protected getTransaction(hash: string) {
		return backOff(async () => {
			const value = await this.config.web3.eth.getTransaction(hash)
			if (!value) {
				throw new Error("No transaction found")
			}
			return value
		}, {
			maxDelay: 5000,
			numOfAttempts: 10,
			delayFirstAttempt: true,
			startingDelay: 300,
		})
	}

	async getFrom(): Promise<string> {
		return getFrom(this.config.web3, this.config.from)
	}
}