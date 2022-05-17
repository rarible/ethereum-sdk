import type { Ethereum } from "@rarible/ethereum-provider"
import type { SimpleRaribleV2Order } from "./types"

export function encodeRaribleV2OrderAndSignature(
	ethereum: Ethereum, order: SimpleRaribleV2Order, signature: string
): string {
	const encoded = ethereum.encodeParameter(ORDER_AND_SIG, { orderLeft: order, signatureLeft: signature })
	return `0x${encoded.slice(66)}`
}

const RARIBLEV2_LEFT_ORDER_TYPE = {
	"components": [
		{
			name: "maker",
			type: "address",
		},
		{
			"components": [
				{
					"components": [
						{
							"name": "assetClass",
							"type": "bytes4",
						},
						{
							"name": "data",
							"type": "bytes",
						},
					],
					"name": "assetType",
					"type": "tuple",
				},
				{
					"name": "value",
					"type": "uint256",
				},
			],
			"name": "makeAsset",
			"type": "tuple",
		},
		{
			"name": "taker",
			"type": "address",
		},
		{
			"components": [
				{
					"components": [
						{
							"name": "assetClass",
							"type": "bytes4",
						},
						{
							"name": "data",
							"type": "bytes",
						},
					],
					"name": "assetType",
					"type": "tuple",
				},
				{
					"name": "value",
					"type": "uint256",
				},
			],
			"name": "takeAsset",
			"type": "tuple",
		},
		{
			"name": "salt",
			"type": "uint256",
		},
		{
			"name": "start",
			"type": "uint256",
		},
		{
			"name": "end",
			"type": "uint256",
		},
		{
			"name": "dataType",
			"type": "bytes4",
		},
		{
			"name": "data",
			"type": "bytes",
		},
	],
	"name": "orderLeft",
	"type": "tuple",
}

const RARIBLEV2_LEFT_SIGNATURE_TYPE = {
	"name": "signatureLeft",
	"type": "bytes",
}

const ORDER_AND_SIG = {
	components: [
		RARIBLEV2_LEFT_ORDER_TYPE,
		RARIBLEV2_LEFT_SIGNATURE_TYPE,
	],
	name: "data",
	type: "tuple",
}
