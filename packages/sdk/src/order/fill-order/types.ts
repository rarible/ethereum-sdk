import type { Address } from "@rarible/types"
import type { Part } from "@rarible/ethereum-api-client"
import type { Action } from "@rarible/action"
import type { EthereumTransaction } from "@rarible/ethereum-provider"
import type { EthereumFunctionCall, EthereumSendOptions } from "@rarible/ethereum-provider"
import type { SimpleCryptoPunkOrder, SimpleLegacyOrder, SimpleOpenSeaV1Order, SimpleRaribleV2Order } from "../types"

type CommonFillRequest<T> = { order: T, amount: number, infinite?: boolean }

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
	getTransactionFromRequest: (request: T) => Promise<OrderFillTransactionData>

	getBaseOrderFee(order: T["order"]): number

	getOrderFee(order: T["order"]): number
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
