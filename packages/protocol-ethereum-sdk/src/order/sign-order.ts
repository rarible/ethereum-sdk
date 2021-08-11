import { Asset, Binary, EIP712Domain, Order } from "@rarible/protocol-api-client"
import { Address, toBinary, ZERO_ADDRESS } from "@rarible/types"
import { Ethereum, signTypedData } from "@rarible/ethereum-provider"
import { Config } from "../config/type"
import { hashLegacyOrder } from "./hash-legacy-order"
import { assetTypeToStruct } from "./asset-type-to-struct"
import { EIP712_DOMAIN_TEMPLATE, EIP712_ORDER_TYPE, EIP712_ORDER_TYPES } from "./eip712"
import { encodeData } from "./encode-data"

export type SimpleOrder = Pick<Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export async function signOrder(
	ethereum: Ethereum,
	config: Pick<Config, "exchange" | "chainId">,
	order: SimpleOrder,
): Promise<Binary> {
	switch (order.type) {
		case "RARIBLE_V1": {
			const legacyHash = hashLegacyOrder(order)
			return toBinary(await ethereum.personalSign(legacyHash))
			// @ts-ignore
			// return (ethereum.eth.personal as any)// todo
			// 	.sign(legacyHash.substring(2), order.maker)
			// 	.catch((error: any) => {
			// 		if (error.code === 4001) {
			// 			return Promise.reject(new Error("Cancelled"))
			// 		}
			// 		return Promise.reject(error)
			// 	})
		}
		case "RARIBLE_V2": {
			const domain = createEIP712Domain(config.chainId, config.exchange.v2)
			const signature = await signTypedData(ethereum, {
				primaryType: EIP712_ORDER_TYPE,
				domain,
				types: EIP712_ORDER_TYPES,
				message: orderToStruct(order),
			})
			return toBinary(signature)
		}
	}
	throw new Error(`Unsupported order type: ${order.type}`)
}


function createEIP712Domain(chainId: number, verifyingContract: Address): EIP712Domain {
	return {
		...EIP712_DOMAIN_TEMPLATE,
		verifyingContract: verifyingContract,
		chainId,
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
		data,
	}
}

function assetToStruct(asset: Asset) {
	return {
		assetType: assetTypeToStruct(asset.assetType),
		value: asset.value,
	}
}
