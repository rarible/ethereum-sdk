import type { Address } from "@rarible/types"
import type { Part } from "@rarible/ethereum-api-client"
import type { Action } from "@rarible/action"
import type { EthereumTransaction } from "@rarible/ethereum-provider"
import type { EthereumFunctionCall, EthereumSendOptions } from "@rarible/ethereum-provider"
import type {
	CryptoPunksAssetType,
	Erc1155AssetType,
	Erc721AssetType,
} from "@rarible/ethereum-api-client"
import type { Erc1155LazyAssetType, Erc721LazyAssetType } from "@rarible/ethereum-api-client/build/models/AssetType"
import type { SimpleCryptoPunkOrder, SimpleLegacyOrder, SimpleOpenSeaV1Order, SimpleRaribleV2Order } from "../types"
import type { NftAssetType } from "../check-asset-type"

export type CommonFillRequestAssetType =
	Erc721AssetType | Erc721LazyAssetType | Erc1155AssetType |
	Erc1155LazyAssetType | CryptoPunksAssetType | NftAssetType

export type CommonFillRequest<T> = {
	order: T,
	amount: number,
	infinite?: boolean,
	assetType?: CommonFillRequestAssetType
}

export type LegacyOrderFillRequest =
  CommonFillRequest<SimpleLegacyOrder> & { payout?: Address, originFee: number }
export type RaribleV2OrderFillRequest =
  CommonFillRequest<SimpleRaribleV2Order> & { payouts?: Part[], originFees?: Part[] }
export type OpenSeaV1OrderFillRequest =
  Omit<CommonFillRequest<SimpleOpenSeaV1Order>, "amount">
export type CryptoPunksOrderFillRequest = CommonFillRequest<SimpleCryptoPunkOrder>

export type FillOrderRequest =
  LegacyOrderFillRequest |
  RaribleV2OrderFillRequest |
  OpenSeaV1OrderFillRequest |
  CryptoPunksOrderFillRequest

export type FillOrderAction = Action<FillOrderStageId, FillOrderRequest, EthereumTransaction>
export type FillOrderStageId = "approve" | "send-tx"

export interface OrderHandler<T extends FillOrderRequest> {
	invert: (request: T, maker: Address) => T["order"]
	approve: (order: T["order"], infinite: boolean) => Promise<void>
	sendTransaction: (initial: T["order"], inverted: T["order"], request: T) => Promise<EthereumTransaction>
	getTransactionData: (order: T["order"], inverted: T["order"], request: T) => Promise<OrderFillSendData>

	getBaseOrderFee(order: T["order"]): Promise<number> | number

	getOrderFee(order: T["order"]): Promise<number> | number
}

export type GetOrderFillTxData = (request: FillOrderRequest) => Promise<OrderFillTransactionData>

export type OrderFillTransactionData = {
	data: string
	options: EthereumSendOptions
}

export type OrderFillSendData = {
	functionCall: EthereumFunctionCall
	options: EthereumSendOptions
}
