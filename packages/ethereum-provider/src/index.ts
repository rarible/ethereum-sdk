export interface Ethereum {
	createContract(abi: any, address?: string): EthereumContract

	signTypedData(ethereum: Ethereum, data: any): Promise<string>

	send(method: string, params: any): Promise<any>

	getSigner(): Promise<string[]>

	personalSign(message: string): Promise<string>
}

export interface EthereumContract {
	call(name: string, ...args: any): Promise<any>

	send(name: string, ...args: any): Promise<EthereumTransaction>
}

export interface EthereumTransaction {
	hash: string

	wait(): Promise<void>
}
