import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address, Word } from "@rarible/types"
import { SendFunction } from "../common/send-transaction"
import { Config } from "../config/type"
import { Maybe } from "../common/maybe"
import { createErc721FactoryContract } from "./contracts/erc721/deploy/rarible-factory"
import { createErc721UserFactoryContract } from "./contracts/erc721/deploy/rarible-user-factory"

export class DeployErc721 {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: Config
	) {
		this.deployToken = this.deployToken.bind(this)
		this.deployUserToken = this.deployUserToken.bind(this)
		this.getContractAddress = this.getContractAddress.bind(this)
		this.getUserContractAddress = this.getUserContractAddress.bind(this)
	}

	deployToken(
		name: string, symbol: string, baseURI: string, contractURI: string, salt: Word
	): Promise<EthereumTransaction> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const contract = createErc721FactoryContract(this.ethereum, this.config.factories.erc721)

		return this.send(
			contract.functionCall("createToken", name, symbol, baseURI, contractURI, salt)
		)
	}

	getContractAddress(
		name: string, symbol: string, baseURI: string, contractURI: string, salt: Word
	): Promise<Address> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const contract = createErc721FactoryContract(this.ethereum, this.config.factories.erc721)
		return contract.functionCall("getAddress", name, symbol, baseURI, contractURI, salt).call()
	}

	deployUserToken(
		name: string, symbol: string, baseURI: string, contractURI: string, operators: Address[], salt: Word
	): Promise<EthereumTransaction> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const contract = createErc721UserFactoryContract(this.ethereum, this.config.factories.erc721User)

		return this.send(
			contract.functionCall("createToken", name, symbol, baseURI, contractURI, operators, salt)
		)
	}

	getUserContractAddress(
		name: string, symbol: string, baseURI: string, contractURI: string, operators: Address[], salt: Word
	): Promise<Address> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const contract = createErc721UserFactoryContract(this.ethereum, this.config.factories.erc721User)
		return contract.functionCall("getAddress", name, symbol, baseURI, contractURI, operators, salt).call()
	}
}
