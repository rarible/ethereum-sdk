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

export type BidRequest = {
	maker: Address
	makeAssetType: EthAssetType | Erc20AssetType,
	amount: number
	takeAssetType: Erc721AssetType | Erc1155AssetType,
	price: number
	payouts: Array<Part>
	originFees: Array<Part>
}

export function bid(
	api: NftItemControllerApi,
	upsertOrder: UpsertOrderFunction,
	request: BidRequest,
) {
	const order: OrderForm = {
		maker: request.maker,
		make: {
			assetType: request.makeAssetType,
			value: toBigNumber(toBn(request.amount).multipliedBy(request.price).toString()),
		},
		take: {
			assetType: request.takeAssetType,
			value: toBigNumber(`${request.amount}`)
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
