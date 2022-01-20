import type { Contract} from "ethers"
import { ethers } from "ethers"
import type { TransactionResponse } from "@ethersproject/abstract-provider"
import type * as EthereumProvider from "@rarible/ethereum-provider"
import { signTypedData } from "@rarible/ethereum-provider"
import type { Address, Binary, BigNumber, Word } from "@rarible/types"
import { toAddress, toBigNumber, toBinary, toWord } from "@rarible/types"
import type { MessageTypes, TypedMessage } from "@rarible/ethereum-provider/src/domain"
import type { TypedDataSigner } from "@ethersproject/abstract-signer"
import { encodeParameters } from "./abi-coder"

export class EthersWeb3ProviderEthereum implements EthereumProvider.Ethereum {
	constructor(readonly web3Provider: ethers.providers.Web3Provider, readonly from?: string) {
		this.send = this.send.bind(this)
	}

	createContract(abi: any, address?: string): EthereumProvider.EthereumContract {
		if (!address) {
			throw new Error("No Contract address provided, it's required for EthersEthereum")
		}
		return new EthersContract(new ethers.Contract(address, abi, this.web3Provider.getSigner()))
	}

	send(method: string, params: any): Promise<any> {
		return this.web3Provider.send(method, params)
	}

	personalSign(message: string): Promise<string> {
		return this.web3Provider.getSigner().signMessage(message)
	}

	async signTypedData<T extends MessageTypes>(data: TypedMessage<T>): Promise<string> {
		const signer = await this.getFrom()
		return signTypedData(this.send, signer, data)
	}

	async getFrom(): Promise<string> {
		if (!this.from) {
			const [first] = await this.web3Provider.listAccounts()
			return first
		}
		return this.from
	}

	encodeParameter(type: any, parameter: any): string {
		return encodeParameters([type], [parameter])
	}

	async getBalance(address: Address): Promise<BigNumber> {
		const balance = await this.web3Provider.getBalance(address)
		return toBigNumber(balance.toString())
	}

	async getChainId(): Promise<number> {
		const { chainId } = await this.web3Provider.getNetwork()
		return chainId
	}
}

export class EthersEthereum implements EthereumProvider.Ethereum {
	constructor(readonly signer: TypedDataSigner & ethers.Signer) {}

	createContract(abi: any, address?: string): EthereumProvider.EthereumContract {
		if (!address) {
			throw new Error("No Contract address provided, it's required for EthersEthereum")
		}
		return new EthersContract(new ethers.Contract(address, abi, this.signer))
	}

	personalSign(message: string): Promise<string> {
		return this.signer.signMessage(message)
	}

	async signTypedData<T extends MessageTypes>(data: TypedMessage<T>): Promise<string> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { EIP712Domain, ...types } = data.types
		return this.signer._signTypedData(data.domain, types, data.message)
	}

	getFrom(): Promise<string> {
		return this.signer.getAddress()
	}

	encodeParameter(type: any, parameter: any): string {
		return encodeParameters([type], [parameter])
	}

	async getBalance(address: Address): Promise<BigNumber> {
		if (!this.signer.provider) {
			throw new Error("EthersEthereum: signer provider does not exist")
		}
		const balance = await this.signer.provider.getBalance(address)
		return toBigNumber(balance.toString())
	}

	async getChainId(): Promise<number> {
		return this.signer.getChainId()
	}
}

export class EthersContract implements EthereumProvider.EthereumContract {
	constructor(private readonly contract: Contract) {
	}

	functionCall(name: string, ...args: any): EthereumProvider.EthereumFunctionCall {
		return new EthersFunctionCall(this.contract, name, args)
	}
}

export class EthersFunctionCall implements EthereumProvider.EthereumFunctionCall {
	constructor(
		private readonly contract: Contract,
		private readonly name: string,
		private readonly args: any[],
	) {}

	async getCallInfo(): Promise<EthereumProvider.EthereumFunctionCallInfo> {
		return {
			method: this.name,
			args: this.args,
			from: undefined,
		}
	}

	get data(): string {
		return (this.contract.populateTransaction[this.name](...this.args) as any).data
	}

	async estimateGas() {
		const func = this.contract.estimateGas[this.name].bind(null, ...this.args)
		const value = await func()
		return value.toNumber()
	}

	call(options?: EthereumProvider.EthereumSendOptions): Promise<any> {
		const func = this.contract[this.name].bind(null, ...this.args)
		if (options) {
			return func(options)
		} else {
			return func()
		}
	}

	async send(options?: EthereumProvider.EthereumSendOptions): Promise<EthereumProvider.EthereumTransaction> {
		const func = this.contract[this.name].bind(null, ...this.args)
		if (options) {
			return new EthersTransaction(await func(options))
		} else {
			return new EthersTransaction(await func())
		}
	}
}

export class EthersTransaction implements EthereumProvider.EthereumTransaction {
	constructor(private readonly tx: TransactionResponse) {}

	get hash(): Word {
		return toWord(this.tx.hash)
	}

	async wait(): Promise<EthereumProvider.EthereumTransactionReceipt> {
		const receipt = await this.tx.wait()
		return {
			...receipt,
			status: receipt.status === 1,
			events: (receipt as any).events,
		}
	}

	get to(): Address | undefined {
		return this.tx.to ? toAddress(this.tx.to) : undefined
	}

	get from(): Address {
		return toAddress(this.tx.from)
	}

	get data(): Binary {
		return toBinary(this.tx.data)
	}

	get nonce(): number {
		return this.tx.nonce
	}
}
