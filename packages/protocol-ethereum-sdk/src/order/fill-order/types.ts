import { Address } from "@rarible/types"
import { Part } from "@rarible/ethereum-api-client"
import { Action } from "@rarible/action"
import { EthereumTransaction } from "@rarible/ethereum-provider"
import { SimpleCryptoPunkOrder, SimpleLegacyOrder, SimpleOpenSeaV1Order, SimpleRaribleV2Order } from "../types"

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
	getBaseOrderFee(order: T["order"]): number
	getOrderFee(order: T["order"]): number
}
