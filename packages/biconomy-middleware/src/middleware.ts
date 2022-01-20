import Web3 from "web3"
import { Biconomy } from "@biconomy/mexa"
import type { JsonRpcEngine, JsonRpcMiddleware } from "json-rpc-engine"
import { createAsyncMiddleware } from "json-rpc-engine"
import type { Block } from "eth-json-rpc-middleware/dist/utils/cache"
import { providerRequest } from "../../common/utils/provider-request"
import type { IBiconomyConfig, IContractRegistry } from "./types"

export function biconomyMiddleware(
	provider: any,
	registry: IContractRegistry,
	biconomyConfig: IBiconomyConfig
): JsonRpcMiddleware<string[], Block> {
	const biconomy = new Biconomy(getBiconomySupportedProvider(provider), biconomyConfig)
	const biconomyState = new Promise(((resolve, reject) => {
		biconomy.onEvent(biconomy.READY, resolve)
		biconomy.onEvent(biconomy.ERROR, (error: any, message: any) => reject(new Error(error.toString() + "\n" + message)))
	}))

	return createAsyncMiddleware(async (req, res, next) => {
		await biconomyState
		const web3 = new Web3(biconomy)

		if (req.method === "eth_sendTransaction" && req.params) {
			const [tx] = req.params as unknown[]
			if (isTransactionParams(tx)) {
				try {
					const metadata = await registry.getMetadata(tx.to)
					if (metadata) {
						const contract = createContract(web3, metadata.abi, metadata.address)

						const dataToSign = {
							...metadata.signData,
							message: {
								nonce: parseInt(await contract.methods.getNonce(tx.from).call()),
								from: tx.from,
								functionSignature: tx.data,
							},
						}

						const {r, s, v} = getSignatureParameters(web3, await providerRequest(
							provider,
							"eth_signTypedData_v4",
							[tx.from, dataToSign]
						))

						tx.data = contract.methods.executeMetaTransaction(tx.from, tx.data, r, s, v).encodeABI()

						const response = await providerRequest(biconomy, "eth_sendTransaction", [tx])
						res.result = response

						return
					}
				} catch (err: any) {
					res.error = err
				}
			}
		}
		await next()
	})
}

function createContract(web3: Web3, abi: any, address: string) {
	return new web3.eth.Contract(abi, address)
}

function getBiconomySupportedProvider(provider: any) {
	try {
		if (provider.send) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const probe = provider.send()
		} else {
			provider.send = provider.sendAsync
		}
	} catch (e: any) {
		if (e.toString().includes("does not support synchronous requests")) {
			provider.send = provider.sendAsync
		}
	}

	return provider
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

type TransactionParams = {
	from: string
	to: string
	data: string
}

function isTransactionParams(x: unknown): x is TransactionParams {
	return typeof x === "object" &&
		x !== null &&
		"from" in x &&
		"to" in x &&
		"data" in x
}