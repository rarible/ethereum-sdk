import Web3 from "web3"
import { Contract } from "web3-eth-contract"
import { PromiEvent } from "web3-core"
import {
	Ethereum,
	EthereumContract,
	EthereumFunctionCall,
	EthereumSendOptions,
	EthereumTransaction,
} from "@rarible/ethereum-provider"

type Web3EthereumConfig = {
	web3: Web3
	from?: string
	gas?: number
}

export class Web3Ethereum implements Ethereum {
	constructor(private readonly config: Web3EthereumConfig) {
	}

	createContract(abi: any, address?: string): EthereumContract {
		return new Web3Contract(this.config, new this.config.web3.eth.Contract(abi, address))
	}

	async send(method: string, params: any): Promise<any> {
		const signer = await this.getFrom()
		return await new Promise<string>((resolve, reject) => {
			function cb(err: any, result: any) {
				if (err) return reject(err)
				if (result.error) return reject(result.error)
				resolve(result.result)
			}

			// @ts-ignore
			return this.config.web3.currentProvider.sendAsync({
				method,
				params: [signer, params[1]],
				signer,
			}, cb)
		})
	}

	async personalSign(message: string): Promise<string> {
		const signer = await this.getFrom()
		return (this.config.web3.eth.personal as any)
			.sign(message, signer)
			.catch((error: any) => {
				if (error.code === 4001) {
					return Promise.reject(new Error("Cancelled"))
				}
				return Promise.reject(error)
			})
	}

	async getFrom(): Promise<string> {
		if (this.config.from) {
			return this.config.from
		}
		return this.config.web3.eth.getAccounts().then(([first]) => first)
	}
}


export class Web3Contract implements EthereumContract {
	constructor(private readonly config: Web3EthereumConfig, private readonly contract: Contract) {
	}

	functionCall(name: string, ...args: any): EthereumFunctionCall {
		return new Web3FunctionCall(this.config, this.contract, this.contract.methods[name].bind(null, ...args))
	}
}

export class Web3FunctionCall implements EthereumFunctionCall {
	constructor(
		private readonly config: Web3EthereumConfig,
		private readonly contract: Contract,
		private readonly func: any,
	) {
	}

	call(options?: EthereumSendOptions): Promise<any> {
		return this.func().call({ ...options })
	}

	async send(options?: EthereumSendOptions): Promise<EthereumTransaction> {
		const address = await this.getFrom()
		const promiEvent: PromiEvent<any> = this.func().send({
			from: address,
			gas: this.config.gas,
			...options,
		})
		const hash = await new Promise<string>(((resolve, reject) => {
			promiEvent.on("transactionHash", resolve)
			promiEvent.on("error", reject)
		}))
		return new Web3Transaction(hash, promiEvent)
	}

	async getFrom(): Promise<string> {
		if (this.config.from) {
			return this.config.from
		}
		return this.config.web3.eth.getAccounts().then(([first]) => first)
	}
}

export class Web3Transaction implements EthereumTransaction {
	constructor(readonly hash: string, private readonly promiEvent: PromiEvent<any>) {
	}

	wait(): Promise<void> {
		return new Promise(((resolve, reject) => {
			this.promiEvent.on("receipt", r => resolve())
			this.promiEvent.on("error", reject)
		}))
	}
}


