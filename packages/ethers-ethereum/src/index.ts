import { Contract, ethers } from "ethers"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider"

export class EthersEthereum implements Ethereum {
	constructor(readonly web3Provider: ethers.providers.Web3Provider) {
	}

	createContract(abi: any, address?: string): EthereumContract {
		return new EthersContract(new ethers.Contract(address!, abi, this.web3Provider.getSigner()))
	}

	async send(method: string, params: any): Promise<any> {
		const [signer] = await this.getSigner()
		return await this.web3Provider.send(method, [signer, params])
	}

	async getSigner(): Promise<string[]> {
		return await this.web3Provider.listAccounts()
	}

	async signTypedData(primaryType: string, domain: any, types: any, message: any): Promise<string> {
		const data = {
			types: {
				EIP712Domain: DOMAIN_TYPE,
				...types,
			},
			domain,
			primaryType,
			message,
		}
		const [signer] = await this.web3Provider.listAccounts()
		try {
			return await tryToSign(this.web3Provider, SignTypedDataTypes.SIGN_TYPED_DATA_V4, signer, JSON.stringify(data))
		} catch (error) {
			try {
				return await tryToSign(this.web3Provider, SignTypedDataTypes.SIGN_TYPED_DATA_V3, signer, data)
			} catch (error) {
				try {
					return await tryToSign(this.web3Provider, SignTypedDataTypes.SIGN_TYPED_DATA, signer, data)
				} catch (error) {
					return await Promise.reject(error)
				}
			}
		}
	}

	personalSign(message: string): Promise<string> {
		return this.web3Provider.getSigner().signMessage(message);
	}
}

export class EthersContract implements EthereumContract {
	constructor(private readonly contract: Contract) {
	}

	call(name: string, ...args: any): Promise<any> {
		return this.contract[name](...args)
	}

	async send(name: string, ...args: any): Promise<EthereumTransaction> {
		const tx: TransactionResponse = await this.contract[name](...args)
		return new EthersTransaction(tx)
	}

}

export class EthersTransaction implements EthereumTransaction {
	constructor(private readonly tx: TransactionResponse) {
	}

	get hash(): string {
		return this.tx.hash!
	}

	async wait(): Promise<void> {
		await this.tx.wait()
	}
}

export const DOMAIN_TYPE = [
	{ type: "string", name: "name" },
	{ type: "string", name: "version" },
	{ type: "uint256", name: "chainId" },
	{ type: "address", name: "verifyingContract" },
]


async function tryToSign(web3: ethers.providers.Web3Provider, type: SignTypedDataTypes, signer: string, data: any): Promise<string> {
	return await web3.send(type, [signer, data])
}

enum SignTypedDataTypes {
	SIGN_TYPED_DATA = "eth_signTypedData",
	SIGN_TYPED_DATA_V3 = "eth_signTypedData_v3",
	SIGN_TYPED_DATA_V4 = "eth_signTypedData_v4"
}
