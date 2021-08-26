import { OrderData } from "@rarible/protocol-api-client/build/models/OrderData"
import { id } from "../common/id"
import { abi } from "./abi"

//todo wrongEncode когда применять?
export function encodeData(data: OrderData, wrongEncode: Boolean = false): [string, string] {
	switch (data.dataType) {
		case "RARIBLE_V2_DATA_V1": {
			const encoded = abi.encodeParameter(DATA_V1_TYPE, {
				payouts: data.payouts,
				originFees: data.originFees,
			})
			if (wrongEncode) {
				return [id("V1"), `0x${encoded.substring(66)}`]
			}
			return [id("V1"), encoded]
		}
	}
	throw new Error(`Data type not supported: ${data.dataType}`)
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
