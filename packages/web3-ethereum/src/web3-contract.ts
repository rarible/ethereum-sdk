import type * as EthereumProvider from "@rarible/ethereum-provider"
import type { Contract } from "web3-eth-contract"
import { Web3MetaFunctionCall } from "./web3-meta-function-call"
import { Web3FunctionCall } from "./web3-function-call"
import type { Web3ContractConfig } from "./domain"

export class Web3Contract implements EthereumProvider.EthereumContract {
	constructor(private readonly config: Web3ContractConfig, private readonly contract: Contract) {}

	functionCall(name: string, ...args: any): EthereumProvider.EthereumFunctionCall {
		let FunctionCaller = Web3FunctionCall

		if (this.config.walletWeb3 && this.contract.methods["executeMetaTransaction"] !== undefined) {
			FunctionCaller = Web3MetaFunctionCall
		}

		return new FunctionCaller(
			this.config,
			this.contract.methods[name](...args),
			this.contract
		)
	}
}