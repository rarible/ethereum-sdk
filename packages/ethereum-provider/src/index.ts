export interface Ethereum {
	createContract(abi: any, address?: string): EthereumContract

	signTypedData(primaryType: string, domain: any, types: any, message: any): Promise<string>
}

export interface EthereumContract {
	call(name: string, ...args: any): Promise<any>

	send(name: string, ...args: any): Promise<EthereumTransaction>
}

export interface EthereumTransaction {
	hash: string

	wait(): Promise<void>
}
