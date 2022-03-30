export interface IBiconomyConfig {
	apiKey: string,
	debug?: boolean,
}

export type ContractMetadata = {
	types: {
		EIP712Domain: {name: string, type: string}[]
		MetaTransaction: {name: string, type: string}[],
	},
	domain: Record<string, any>,
	primaryType: string,
	allowedFunctions?: string[],
	[key: string]: any
}

export interface IContractRegistry {
	getMetadata(address: string, data?: string): Promise<ContractMetadata | undefined>
}
