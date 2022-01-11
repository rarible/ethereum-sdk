import type Web3 from "web3"
import type * as EthereumProvider from "@rarible/ethereum-provider"
import { Web3FunctionCall } from "./web3-function-call"
import { getFrom } from "./utils/get-from"
import { providerRequest } from "./utils/provider-request"

/**
 * Use biconomy for meta transaction
 */
export class Web3MetaFunctionCall extends Web3FunctionCall implements EthereumProvider.EthereumFunctionCall {
	override async send(
		options: EthereumProvider.EthereumSendOptions = {}
	): Promise<EthereumProvider.EthereumTransaction> {
		const from = await this.getFrom()
		const functionSignature = this.sendMethod.encodeABI()
		const dataToSign = JSON.stringify({
			types: {
				EIP712Domain: [
					{name: "name", type: "string"},
					{name: "version", type: "string"},
					{type: "uint256", name: "chainId"},
					{name: "verifyingContract", type: "address"},
				],
				MetaTransaction: [
					{name: "nonce", type: "uint256"},
					{name: "from", type: "address"},
					{name: "functionSignature", type: "bytes"},
				],
			},
			domain: {
				name: this.config.contractData?.name,
				version: this.config.contractData?.version,
				chainId: await this.config.web3.eth.getChainId(),
				verifyingContract: this.contract.options.address,
			},
			primaryType: "MetaTransaction",
			message: {
				nonce: parseInt(await this.contract.methods.getNonce(from).call()),
				from,
				functionSignature,
			},
		})

		const response = await providerRequest(
			this.config.web3.currentProvider,
			"eth_signTypedData_v4",
			[from, dataToSign]
		)
		let {r, s, v} = getSignatureParameters(this.config.web3, response)

		return this.contract.methods.executeMetaTransaction(from, functionSignature, r, s, v).send({from, ...options})
	}

	override async getFrom(): Promise<string> {
		return getFrom(this.config.walletWeb3!, this.config.from)
	}
}

function getSignatureParameters(web3: Web3, signature: string) {
	if (!web3.utils.isHexStrict(signature)) {
		throw new Error(
			'Given value "'.concat(signature, '" is not a valid hex string.')
		)
	}
	const r = signature.slice(0, 66)
	const s = "0x".concat(signature.slice(66, 130))
	let v: any = "0x".concat(signature.slice(130, 132))
	v = web3.utils.hexToNumber(v)
	if (![27, 28].includes(v)) v += 27
	return {
		r: r,
		s: s,
		v: v,
	}
}