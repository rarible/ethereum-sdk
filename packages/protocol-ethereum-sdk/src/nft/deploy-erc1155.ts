import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address, Word } from "@rarible/types"
import { SendFunction } from "../common/send-transaction"
import { Config } from "../config/type"
import { createErc1155FactoryContract } from "./contracts/erc1155/deploy/rarible-factory"
import { createErc1155UserFactoryContract } from "./contracts/erc1155/deploy/rarible-user-factory"

export class DeployErc1155 {
	constructor(
		private readonly ethereum: Ethereum,
		private readonly send: SendFunction,
		private readonly config: Config
	) {
		this.deployToken = this.deployToken.bind(this)
		this.deployUserToken = this.deployUserToken.bind(this)
	}

	deployToken(
		name: string, symbol: string, baseURI: string, contractURI: string, salt: Word
	): Promise<EthereumTransaction> {
		const contract = createErc1155FactoryContract(this.ethereum, this.config.factories.erc1155)

		return this.send(
			contract.functionCall("createToken", name, symbol, baseURI, contractURI, salt)
		)
	}

	getContractAddress(
		name: string, symbol: string, baseURI: string, contractURI: string, salt: Word
	): Promise<Address> {
		const contract = createErc1155FactoryContract(this.ethereum, this.config.factories.erc1155)
		return contract.functionCall("getAddress", name, symbol, baseURI, contractURI, salt).call()
	}

	deployUserToken(
		name: string, symbol: string, baseURI: string, contractURI: string, operators: Address[], salt: Word
	): Promise<EthereumTransaction> {
		const contract = createErc1155UserFactoryContract(this.ethereum,  this.config.factories.erc1155User)
		return this.send(
			contract.functionCall("createToken", name, symbol, baseURI, contractURI, operators, salt)
		)
	}

	getUserContractAddress(
		name: string, symbol: string, baseURI: string, contractURI: string, operators: Address[], salt: Word
	): Promise<Address> {
		const contract = createErc1155UserFactoryContract(this.ethereum, this.config.factories.erc1155User)
		return contract.functionCall("getAddress", name, symbol, baseURI, contractURI, operators, salt).call()
	}
}
