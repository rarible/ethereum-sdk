import { Address } from "@rarible/types"
import { Part } from "@rarible/protocol-api-client"
import { ActionBuilder } from "@rarible/action"
import { EthereumTransaction } from "@rarible/ethereum-provider"
import { SimpleLegacyOrder, SimpleOpenSeaV1Order, SimpleRaribleV2Order } from "../types"

type CommonFillRequest<T> = { order: T, amount: number, infinite?: boolean }

export type LegacyOrderFillRequest =
	CommonFillRequest<SimpleLegacyOrder> & { payout?: Address, originFee: number }
export type RaribleV2OrderFillRequest =
	CommonFillRequest<SimpleRaribleV2Order> & { payouts?: Part[], originFees?: Part[] }
export type OpenSeaV1OrderFillRequest =
	Omit<CommonFillRequest<SimpleOpenSeaV1Order>, "amount">

export type FillOrderRequest = LegacyOrderFillRequest | RaribleV2OrderFillRequest | OpenSeaV1OrderFillRequest

export type FillOrderAction = ActionBuilder<FillOrderStageId, void, [void, EthereumTransaction]>
export type FillOrderStageId = "approve" | "send-tx"

export interface OrderHandler<T extends FillOrderRequest> {
	invert: (request: T, maker: Address) => T["order"]
	approve: (order: T["order"], infinite: boolean) => Promise<void>
	sendTransaction: (initial: T["order"], inverted: T["order"], request: T) => Promise<EthereumTransaction>
	getBaseOrderFee(order: T["order"]): number
	getOrderFee(order: T["order"]): number
}
