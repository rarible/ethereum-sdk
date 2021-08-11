import Web3 from "web3"
import { Contract } from "web3-eth-contract"
import { PromiEvent } from "web3-core"
import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider"

export class Web3Ethereum implements Ethereum {
	constructor(private readonly web3: Web3) {
	}

	createContract(abi: any, address?: string): EthereumContract {
		return new Web3Contract(this.web3, new this.web3.eth.Contract(abi, address))
	}

	async send(method: string, params: any): Promise<any> {

		const [signer] = await this.web3.eth.getAccounts()
		return await new Promise<string>((resolve, reject) => {
			function cb(err: any, result: any) {
				if (err) return reject(err)
				if (result.error) return reject(result.error)
				resolve(result.result)
			}

			// @ts-ignore
			return await this.web3.currentProvider.sendAsync({
				method,
				params: [signer, params],
				signer,
			}, cb)
		})
	}

	async getAccounts(): Promise<string[]> {
		return await this.web3.eth.getAccounts()
	}

	async personalSign(message: string): Promise<string> {
		const [signer] = await this.web3.eth.getAccounts()
		return (this.web3.eth.personal as any)
			.sign(message, signer)
			.catch((error: any) => {
				if (error.code === 4001) {
					return Promise.reject(new Error("Cancelled"))
				}
				return Promise.reject(error)
			})
	}
}


export class Web3Contract implements EthereumContract {
	constructor(private readonly web3: Web3, private readonly contract: Contract) {
	}

	call(name: string, ...args: any): Promise<any> {
		return this.contract.methods[name](...args).call()
	}

	async send(name: string, ...args: any): Promise<EthereumTransaction> {
		const [address] = await this.web3.eth.getAccounts()
		const promiEvent: PromiEvent<any> = this.contract.methods[name](...args).send({ from: address })
		const hash = await new Promise<string>(((resolve, reject) => {
			promiEvent.on("transactionHash", resolve)
			promiEvent.on("error", reject)
		}))
		return new Web3Transaction(hash, promiEvent)
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


