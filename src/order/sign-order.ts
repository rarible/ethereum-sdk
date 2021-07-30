import { Asset, Binary, EIP712Domain, Order } from "@rarible/protocol-api-client"
import Web3 from "web3"
import { hashLegacyOrder } from "./hash-legacy-order"
import { assetTypeToStruct } from "./asset-type-to-struct"
import { Address, ZERO_ADDRESS } from "@rarible/types"
import { EIP712_DOMAIN_TEMPLATE, EIP712_ORDER_TYPE, EIP712_ORDER_TYPES } from "./eip712"
import { encodeData } from "./encode-data"
import { Config } from "../config/type"

export type SimpleOrder = Pick<Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export async function signOrder(
	web3: Web3,
	config: Pick<Config, "exchange" | "chainId">,
	order: SimpleOrder,
): Promise<Binary> {
	switch (order.type) {
		case "RARIBLE_V1": {
			const legacyHash = hashLegacyOrder(order)
			return (web3.eth.personal as any)
				.sign(legacyHash.substring(2), order.maker)
				.catch((error: any) => {
					if (error.code === 4001) {
						return Promise.reject(new Error("Cancelled"))
					}
					return Promise.reject(error)
				})
		}
		case "RARIBLE_V2": {
			const domain = createEIP712Domain(config.chainId, config.exchange.v2)

			const data = {
				types: EIP712_ORDER_TYPES,
				domain,
				primaryType: EIP712_ORDER_TYPE,
				message: orderToStruct(order)
			}

			return signTypedData(web3, order.maker, data)
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


function createEIP712Domain(chainId: number, verifyingContract: Address): EIP712Domain {
	return {
		...EIP712_DOMAIN_TEMPLATE,
		verifyingContract: verifyingContract,
		chainId
	}
}

export function orderToStruct(order: SimpleOrder) {
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
