import type {
	Address,
	Erc20AssetType,
	EthAssetType,
	NftItemControllerApi,
	OrderForm,
	Part,
	OpenSeaV1OrderForm,
} from "@rarible/protocol-api-client"
import {BigNumber, Binary, randomWord, toBigNumber} from "@rarible/types"
import { BigNumberValue, toBn } from "@rarible/utils/build/bn"
import {
	OrderOpenSeaV1DataV1,
	OrderOpenSeaV1DataV1_FeeMethod, OrderOpenSeaV1DataV1_HowToCall, OrderOpenSeaV1DataV1_SaleKind,
	OrderOpenSeaV1DataV1_Side,
} from "@rarible/protocol-api-client/build/models/OrderData"
import type { AssetTypeRequest, AssetTypeResponse } from "./check-asset-type"
import type { UpsertOrderFunction } from "./upsert-order"
// import {OpenSeaV1OrderForm} from "@rarible/protocol-api-client/build/models/OrderForm";

export enum SellRequestType {
	RARIBLE_V2 = "RARIBLE_V2",
	OPEN_SEA_V1 = "OPEN_SEA_V1",
}

export type SellRequest = SellRequestRarible | SellRequestOpenSea

export type SellRequestRarible = {
	maker: Address
	makeAssetType: AssetTypeRequest
	amount: number
	takeAssetType: EthAssetType | Erc20AssetType
	price: BigNumberValue
	payouts: Array<Part>
	originFees: Array<Part>
	requestType?: SellRequestType.RARIBLE_V2
}

export type SellRequestOpenSea = {
	maker: Address
	makeAssetType: AssetTypeRequest
	takeAssetType: EthAssetType | Erc20AssetType
	amount: number
	price: BigNumberValue
	data: Omit<OrderOpenSeaV1DataV1, "dataType">
	requestType: SellRequestType.OPEN_SEA_V1
}

export function getSellOrderFormRaribleV2(request: SellRequestRarible, assetType: AssetTypeResponse): OrderForm {
	return {
		maker: request.maker,
		make: {
			assetType,
			value: toBigNumber(request.amount.toString()),
		},
		take: {
			assetType: request.takeAssetType,
			value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
		},
		type: SellRequestType.RARIBLE_V2,
		data: {
			dataType: "RARIBLE_V2_DATA_V1",
			payouts: request.payouts,
			originFees: request.originFees,
		},
		salt: toBigNumber(toBn(randomWord(), 16).toString(10)) as any,
	}
}

export function getSellOrderFormOpenSeaV1(request: SellRequestOpenSea, assetType: AssetTypeResponse): OpenSeaV1OrderForm {
	return {
		maker: request.maker,
		make: {
			assetType: assetType,
			value: toBigNumber(request.amount.toString()),
		},
		take: {
			assetType: request.takeAssetType,
			value: toBigNumber(toBn(request.price).multipliedBy(request.amount).toString()),
		},
		type: SellRequestType.OPEN_SEA_V1,
		salt: toBigNumber(toBn(randomWord(), 16).toString(10)) as any,
		// taker = null,
		// take = Asset(
		// 	Erc721AssetType(
		// 		Address.apply("0x509fd4cdaa29be7b1fad251d8ea0fca2ca91eb60"),
		// 		EthUInt256.of(110711)
		// 	),
		// 	EthUInt256.ONE
		// ),
		// makeStock = EthUInt256.TEN,
		// type = OrderType.OPEN_SEA_V1,
		// fill = EthUInt256.ZERO,
		// cancelled = false,
		// salt = EthUInt256.of(BigInteger("81538619411536663679971542969406122025226616498230290046022479480700489875715")),
		// start = 1628140271,
		// end = 1628745154,
		// data = OrderOpenSeaV1DataV1(
		// 	exchange = Address.apply("0x5206e78b21ce315ce284fb24cf05e0585a93b1d9"),
		// 	makerRelayerFee = BigInteger.ZERO,
		// 	takerRelayerFee = BigInteger.valueOf(250),
		// 	makerProtocolFee = BigInteger.ZERO,
		// 	takerProtocolFee = BigInteger.ZERO,
		// 	feeRecipient = Address.apply("0x5b3256965e7c3cf26e11fcaf296dfc8807c01073"),
		// 	feeMethod = OpenSeaOrderFeeMethod.SPLIT_FEE,
		// 	side = OpenSeaOrderSide.BUY,
		// 	saleKind = OpenSeaOrderSaleKind.FIXED_PRICE,
		// 	howToCall = OpenSeaOrderHowToCall.CALL,
		// 	callData = Binary.apply("0x23b872dd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047921676a46ccfe3d80b161c7b4ddc8ed9e716b6000000000000000000000000000000000000000000000000000000000001b077"),
		// 	replacementPattern = Binary.apply("0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
		// 	staticTarget = Address.ZERO(),
		// 	staticExtraData = Binary.apply(),
		// 	extra = BigInteger.ZERO
		// ),
		data: {
			dataType: "OPEN_SEA_V1_DATA_V1",
			...request.data,
		},
		// createdAt = nowMillis(),
		// lastUpdateAt = nowMillis(),
	}
}

export async function sell(
	api: NftItemControllerApi,
	upsertOrder: UpsertOrderFunction,
	checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>,
	request: SellRequest
) {
	// const req: SellRequest = {
	// 	...request,
	// 	requestType: request.requestType || SellRequestType.RARIBLE_V2
	// }
	const assetType = await checkAssetType(request.makeAssetType)
	const requestType: SellRequestType = request.requestType || SellRequestType.RARIBLE_V2


	switch (requestType) {
		case SellRequestType.OPEN_SEA_V1: {
			const order = getSellOrderFormOpenSeaV1(<SellRequestOpenSea>request, assetType)

			return upsertOrder(order, false)
		}

		default: {
			const order = getSellOrderFormRaribleV2(<SellRequestRarible>request, assetType)
			return upsertOrder(order, false)
		}
	}

}
