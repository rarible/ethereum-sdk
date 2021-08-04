import { UpsertOrderFunction } from "./upsert-order"
import {
	Address,
	Erc1155AssetType,
	Erc20AssetType,
	Erc721AssetType,
	EthAssetType,
	NftItemControllerApi,
	OrderForm,
	Part,
} from "@rarible/protocol-api-client"
import { randomWord, toBigNumber } from "@rarible/types"
import { toBn } from "../common/to-bn"

export type SellRequest = {
	maker: Address
	makeAssetType: Erc721AssetType | Erc1155AssetType,
	amount: number
	takeAssetType: EthAssetType | Erc20AssetType
	price: string
	payouts: Array<Part>
	originFees: Array<Part>
}

export function sell(
	api: NftItemControllerApi,
	upsertOrder: UpsertOrderFunction,
	request: SellRequest,
) {
	const order: OrderForm = {
		maker: request.maker,
		make: {
			assetType: request.makeAssetType,
			value: toBigNumber(`${request.amount}`),
		},
		take: {
			assetType: request.takeAssetType,
			value: toBigNumber(toBn(request.amount).multipliedBy(request.price).toString())
		},
		type: "RARIBLE_V2",
		data: {
			dataType: "RARIBLE_V2_DATA_V1",
			payouts: request.payouts,
			originFees: request.originFees
		},
		salt: toBigNumber(toBn(randomWord(), 16).toString(10))
	}
	return upsertOrder(order, false)
}
