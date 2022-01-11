import { signTypedData } from "@rarible/ethereum-provider"
import Web3 from "web3"
import type { Address, BigNumber } from "@rarible/types"
import { toBigNumber } from "@rarible/types"
import type * as EthereumProvider from "@rarible/ethereum-provider"
import type { MessageTypes, TypedMessage } from "@rarible/ethereum-provider/src/domain"
import type { Web3EthereumConfig, Web3ContractConfig, Web3ContractData } from "./domain"
import { providerRequest } from "./utils/provider-request"
import { Web3Contract } from "./web3-contract"
import { getFrom } from "./utils/get-from"

export class Web3Ethereum implements EthereumProvider.Ethereum {
	constructor(private readonly config: Web3EthereumConfig) {
		this.send = this.send.bind(this)
	}

	async createContractAsync(contactData: Web3ContractData): Promise<EthereumProvider.EthereumContract> {
		//check if meta-tx supported
		const metaSupports = this.config.metaTxProvider &&
			this.config.metaTxProvider?.apiKey && // api key for meta-tx provider
			contactData.name !== undefined && // required field for meta-tx
			contactData.version !== undefined && // required field for meta-tx
			contactData.abi.findIndex((method: any) => method.name === "executeMetaTransaction") >= 0 // required method for meta-tx

		const contractConfig: Web3ContractConfig = {
			...this.config,
			contractData: contactData,
		}

		if (metaSupports) {
			const {Biconomy} = await import("@biconomy/mexa")
			const provider = getBiconomySupportedProvider(contractConfig.web3.currentProvider)
			const biconomy = new Biconomy(provider, {
				apiKey: this.config.metaTxProvider?.apiKey,
				debug: this.config.metaTxProvider?.debugMode,
			})

			await new Promise(((resolve, reject) => {
				biconomy.onEvent(biconomy.READY, resolve)
				biconomy.onEvent(biconomy.ERROR, (error: any, message: any) => reject(new Error(error.toString() + "\n" + message)))
			}))

			contractConfig.walletWeb3 = contractConfig.web3
			contractConfig.web3 = new Web3(biconomy)
		}

		return new Web3Contract(contractConfig, new contractConfig.web3.eth.Contract(contactData.abi, contactData.address))
	}

	createContract(abi: any, address?: string): EthereumProvider.EthereumContract {
		return new Web3Contract(this.config, new this.config.web3.eth.Contract(abi, address))
	}

	async send(method: string, params: unknown[]): Promise<any> {
		return providerRequest(this.config.web3.currentProvider, method, params)
	}

	async personalSign(message: string): Promise<string> {
		const signer = await this.getFrom()
		return (this.config.web3.eth.personal as any).sign(message, signer)
	}

	async signTypedData<T extends MessageTypes>(data: TypedMessage<T>): Promise<string> {
		const signer = await this.getFrom()
		return signTypedData(this.send, signer, data)
	}

	async getFrom(): Promise<string> {
		return getFrom(this.config.web3, this.config.from)
	}

	encodeParameter(type: any, parameter: any): string {
		return this.config.web3.eth.abi.encodeParameter(type, parameter)
	}

	async getBalance(address: Address): Promise<BigNumber> {
		return toBigNumber(await this.config.web3.eth.getBalance(address))
	}

	async getChainId(): Promise<number> {
		return this.config.web3.eth.getChainId()
	}
}

function getBiconomySupportedProvider(provider: any) {
	try {
		if (provider.send) {
			// @eslint-ignore
			const probe = provider.send()
		} else {
			provider.send = provider.sendAsync
		}
	} catch (e: any) {
		if (e.toString().includes("does not support synchronous requests")) {
			provider.send = provider.sendAsync
		}
	}

	return provider
}