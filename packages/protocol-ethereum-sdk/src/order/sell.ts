import type {
	Address,
	Erc20AssetType,
	EthAssetType,
	NftItemControllerApi,
	OrderForm,
	Part,
} from "@rarible/protocol-api-client"
import { randomWord, toBigNumber } from "@rarible/types"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import type { AssetTypeRequest, AssetTypeResponse } from "./check-asset-type"
import type { UpsertOrderFunction } from "./upsert-order"

export type SellRequest = {
	maker: Address
	makeAssetType: AssetTypeRequest
	amount: number
	takeAssetType: EthAssetType | Erc20AssetType
	price: BigNumberValue
	payouts: Array<Part>
	originFees: Array<Part>
}

export async function sell(
	api: NftItemControllerApi,
	upsertOrder: UpsertOrderFunction,
	checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
	request: SellRequest
) {
	const order: OrderForm = {
		maker: request.maker,
		make: {
			assetType: await checkAssetType(request.makeAssetType),
			value: toBigNumber(request.amount.toString()),
		},
		take: {
			assetType: request.takeAssetType,
			value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
		},
		type: "RARIBLE_V2",
		data: {
			dataType: "RARIBLE_V2_DATA_V1",
			payouts: request.payouts,
			originFees: request.originFees,
		},
		salt: toBigNumber(toBn(randomWord(), 16).toString(10)) as any,
	}
	return upsertOrder(order, false)
}
