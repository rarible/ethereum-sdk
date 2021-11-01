import { Address, Word } from "@rarible/types"
import { EthereumTransaction } from "@rarible/ethereum-provider"

export type DeployContractRequest = (
	name: string, symbol: string, baseURI: string, contractURI: string, salt: Word
) => Promise<EthereumTransaction>

export type DeployUserContractRequest = (
	name: string, symbol: string, baseURI: string, contractURI: string, operators: Address[], salt: Word
) => Promise<EthereumTransaction>

export type GetContractAddress = (
	name: string, symbol: string, baseURI: string, contractURI: string, salt: Word
) => Promise<Address>

export type GetUserContractAddress = (
	name: string, symbol: string, baseURI: string, contractURI: string, operators: Address[], salt: Word
) => Promise<Address>

export interface DeployNft {
	erc721: {
		deployToken: DeployContractRequest,
		getContractAddress: GetContractAddress,
		deployUserToken: DeployUserContractRequest,
		getUserContractAddress: GetUserContractAddress,
	},
	erc1155: {
		deployToken: DeployContractRequest,
		getContractAddress: GetContractAddress,
		deployUserToken: DeployUserContractRequest,
		getUserContractAddress: GetUserContractAddress,
	},
}
