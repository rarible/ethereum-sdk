export interface IBiconomyConfig {
	apiKey: string,
	debug?: boolean,
}

export type ContractMetadata = {
	abi: [
		{ "name": "getNonce", [key: string]: any },
		{ "name": "executeMetaTransaction", [key: string]: any }
	],
	address: string,
	signData: {
		types: {
			EIP712Domain: {name: string, type: string}[]
			MetaTransaction: {name: string, type: string}[],
		},
		domain: Record<string, any>,
		primaryType: string,
		[key: string]: any
	}
}

export interface IContractRegistry {
	getMetadata(address: string): Promise<ContractMetadata | undefined>
}
