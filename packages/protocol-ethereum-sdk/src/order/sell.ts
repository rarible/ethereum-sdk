import { UpsertOrderFunction } from "./upsert-order"
import {
	Address,
	Erc20AssetType,
	EthAssetType,
	NftItemControllerApi,
	OrderForm,
	Part,
} from "@rarible/protocol-api-client"
import { randomWord, toBigNumber } from "@rarible/types"
import { toBn } from "../common/to-bn"
import {AssetTypeRequest, AssetTypeResponse} from "./check-asset-type";
import BN from "bignumber.js"

export type SellRequest = {
	maker: Address
	makeAssetType: AssetTypeRequest,
	amount: number
	takeAssetType: EthAssetType | Erc20AssetType
	price: BN.Value
	payouts: Array<Part>
	originFees: Array<Part>
}

export async function sell(
	api: NftItemControllerApi,
	upsertOrder: UpsertOrderFunction,
	checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
	request: SellRequest,
) {

	const order: OrderForm = {
		maker: request.maker,
		make: {
			assetType: await checkAssetType(request.makeAssetType),
			value: toBigNumber(`${request.amount}`),
		},
		take: {
			assetType: request.takeAssetType,
			value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString())
		},
		type: "RARIBLE_V2",
		data: {
			dataType: "RARIBLE_V2_DATA_V1",
			payouts: request.payouts,
			originFees: request.originFees
		},
		salt: toBigNumber(toBn(randomWord(), 16).toString(10))
	}
	return await upsertOrder(order, false)
}
