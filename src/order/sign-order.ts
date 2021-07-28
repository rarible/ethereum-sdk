import { Asset, Binary, EIP712Domain, OrderForm } from "@rarible/protocol-api-client"
import Web3 from "web3"
import { hashLegacyOrder } from "./hash-legacy-order"
import { getExhangeV2Address } from "./addresses"
import { assetTypeToStruct } from "./asset-type-to-struct"
import { ZERO_ADDRESS } from "@rarible/types"
import { EIP712_DOMAIN_TEMPLATE, EIP712_ORDER_TYPE, EIP712_ORDER_TYPES } from "./eip712"
import { encodeData } from "./encode-data"

export async function signOrder(web3: Web3, signer: string, order: OrderForm): Promise<OrderForm> {
	switch (order.type) {
		case "RARIBLE_V1": {
			const legacyHash = hashLegacyOrder(order)
			const signature = await (web3.eth.personal as any)
				.sign(legacyHash.substring(2), signer)
				.catch((error: any) => {
					if (error.code === 4001) {
						return Promise.reject(new Error("Cancelled"))
					}
					return Promise.reject(error)
				})
			return {
				...order,
				signature
			}
		}
		case "RARIBLE_V2": {
			const chainId = await web3.eth.getChainId()
			const domain = createEIP712Domain(chainId)

			const data = {
				types: EIP712_ORDER_TYPES,
				domain,
				primaryType: EIP712_ORDER_TYPE,
				message: orderToStruct(order)
			}

			const signature = await signTypedData(web3, signer, data)
			return {
				...order,
				signature
			}
		}
	}
	throw new Error(`Unsupported order type: ${order.type}`)
}

async function signTypedData(web3: Web3, signer: string, data: any) {
	return (await new Promise<Binary>((resolve, reject) => {
		function cb(err: any, result: any) {
			if (err) return reject(err);
			if (result.error) return reject(result.error);
			resolve(result.result);
		}

		// @ts-ignore
		return web3.currentProvider.sendAsync({
			method: "eth_signTypedData", // todo - reverted from eth_signTypedData_v4 for ganache compatibility
			params: [signer, data],
			signer
		}, cb);
	}))
}


function createEIP712Domain(chainId: number): EIP712Domain {
	return {
		...EIP712_DOMAIN_TEMPLATE,
		verifyingContract: getExhangeV2Address(chainId),
		chainId
	}
}

export function orderToStruct(order: OrderForm) {
	const [dataType, data] = encodeData(order.data)
	return {
		maker: order.maker,
		makeAsset: assetToStruct(order.make),
		taker: order.taker ?? ZERO_ADDRESS,
		takeAsset: assetToStruct(order.take),
		salt: order.salt,
		start: order.start ?? 0,
		end: order.end ?? 0,
		dataType,
		data
	}
}

function assetToStruct(asset: Asset) {
	return {
		assetType: assetTypeToStruct(asset.assetType),
		value: asset.value
	}
}
