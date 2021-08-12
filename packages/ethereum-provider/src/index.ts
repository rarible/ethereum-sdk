export interface Ethereum {
	createContract(abi: any, address?: string): EthereumContract

	send(method: string, params: any): Promise<any>

	getFrom(): Promise<string>

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

export async function signTypedData(ethereum: Ethereum, data: any) {
	const signer = await ethereum.getFrom()
	try {
		return await tryToSign(ethereum, SignTypedDataTypes.SIGN_TYPED_DATA_V4, signer, JSON.stringify(data))
	} catch (error) {
		try {
			return await tryToSign(ethereum, SignTypedDataTypes.SIGN_TYPED_DATA_V3, signer, JSON.stringify(data))
		} catch (error) {
			try {
				return await tryToSign(ethereum, SignTypedDataTypes.SIGN_TYPED_DATA, signer, data)
			} catch (error) {
				return await Promise.reject(error)
			}
		}
	}
}


async function tryToSign(ethereum: Ethereum, type: SignTypedDataTypes, signer: string, data: any): Promise<string> {
	return await ethereum.send(type, [signer, data])
}

enum SignTypedDataTypes {
	SIGN_TYPED_DATA = "eth_signTypedData",
	SIGN_TYPED_DATA_V3 = "eth_signTypedData_v3",
	SIGN_TYPED_DATA_V4 = "eth_signTypedData_v4"
}
