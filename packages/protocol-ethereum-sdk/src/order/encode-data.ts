import type { OrderData } from "@rarible/ethereum-api-client"
import type { Ethereum } from "@rarible/ethereum-provider"

//todo wrongEncode когда применять?
export function encodeData(ethereum: Ethereum, data: OrderData, wrongEncode: Boolean = false): [string, string] {
	switch (data.dataType) {
		case "RARIBLE_V2_DATA_V1": {
			const encoded = ethereum.encodeParameter(DATA_V1_TYPE, {
				payouts: data.payouts,
				originFees: data.originFees,
			})
			if (wrongEncode) {
				return ["0x4c234266", `0x${encoded.substring(66)}`]
			}
			return ["0x4c234266", encoded]
		}
		default: {
			throw new Error(`Data type not supported: ${data.dataType}`)
		}
	}
}

const DATA_V1_TYPE = {
	components: [
		{
			components: [
				{
					name: "account",
					type: "address",
				},
				{
					name: "value",
					type: "uint96",
				},
			],
			name: "payouts",
			type: "tuple[]",
		},
		{
			components: [
				{
					name: "account",
					type: "address",
				},
				{
					name: "value",
					type: "uint96",
				},
			],
			name: "originFees",
			type: "tuple[]",
		},
	],
	name: "data",
	type: "tuple",
}
