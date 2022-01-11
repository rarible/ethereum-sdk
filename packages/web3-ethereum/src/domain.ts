import type Web3 from "web3"

export interface Web3Config {
	web3: Web3
	from?: string
	gas?: number
}

export interface Web3EthereumConfig extends Web3Config {
	metaTxProvider?: {
		apiKey: string
		debugMode?: boolean
	}
}

export interface Web3ContractData {
	abi: any,
	address?: string,
	name?: string,
	version?: string,
}

export interface Web3ContractConfig extends Web3Config {
	walletWeb3?: Web3
	contractData?: Web3ContractData
}
