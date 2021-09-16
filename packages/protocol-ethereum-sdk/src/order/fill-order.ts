import { Asset, LegacyOrderForm, OrderControllerApi, Part } from "@rarible/protocol-api-client"
import { Address, toAddress, toBigNumber, toWord, ZERO_ADDRESS } from "@rarible/types"
import { ActionBuilder } from "@rarible/action"
import { toBn } from "@rarible/utils/build/bn"
import type { Ethereum, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import type { ExchangeAddresses } from "../config/type"
import type { SendFunction } from "../common/send-transaction"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { orderToStruct, SimpleLegacyOrder, SimpleOpenSeaV1Order, SimpleOrder, SimpleRaribleV2Order } from "./sign-order"
import { invertOrder } from "./invert-order"
import { addFee } from "./add-fee"
import type { GetMakeFeeFunction } from "./get-make-fee"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { toStructLegacyOrder } from "./to-struct-legacy-order"
import type { ApproveFunction } from "./approve"

type CommonFillRequest<T> = { order: T, amount: number, infinite?: boolean }

export type LegacyOrderFillRequest =
	CommonFillRequest<SimpleLegacyOrder> & { payout?: Address, originFee: number }
export type RaribleV2OrderFillRequest =
	CommonFillRequest<SimpleRaribleV2Order> & { payouts?: Part[], originFees?: Part[] }
export type OpenSeaV1OrderFillRequest =
	CommonFillRequest<SimpleOpenSeaV1Order>

export type FillOrderRequest = LegacyOrderFillRequest | RaribleV2OrderFillRequest | OpenSeaV1OrderFillRequest

export type FillOrderAction = ActionBuilder<FillOrderStageId, void, [void, EthereumTransaction]>
export type FillOrderStageId = "approve" | "send-tx"

export async function fillOrder(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	orderApi: OrderControllerApi,
	approve: ApproveFunction,
	config: ExchangeAddresses,
	request: FillOrderRequest,
): Promise<FillOrderAction> {
	const makeAsset = getMakeAssetV2(getMakeFee, request.order, request.amount)
	const approveAndWait = async () => {
		const tx = await approve(request.order.maker, makeAsset, Boolean(request.infinite))
		if (tx !== undefined) {
			await tx.wait()
		}
	}
	return ActionBuilder
		.create({ id: "approve" as const, run: () => approveAndWait() })
		.thenStage({
			id: "send-tx" as const,
			run: () => fillOrderSendTx(getMakeFee, ethereum, send, config, orderApi, request),
		})
}

function getMakeAssetV2(getMakeFee: GetMakeFeeFunction, order: SimpleOrder, amount: number) {
	const inverted = invertOrder(order, toBn(amount), ZERO_ADDRESS)
	const makeFee = getMakeFee(inverted)
	return addFee(inverted.make, makeFee)
}

export async function fillOrderSendTx(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	config: ExchangeAddresses,
	orderApi: OrderControllerApi,
	request: FillOrderRequest,
): Promise<EthereumTransaction> {
	if (isLegacyRequest(request)) {
		return fillOrderV1(ethereum, send, orderApi, config.v1, request)
	}
	if (isOrderV2Request(request)) {
		return fillOrderV2(getMakeFee, ethereum, send, config.v2, request)
	}
	throw new Error(`Unsupported type: ${request.order.type}`)
}

function isLegacyRequest(request: FillOrderRequest): request is LegacyOrderFillRequest {
	return request.order.type === "RARIBLE_V1"
}

function isOrderV2Request(request: FillOrderRequest): request is RaribleV2OrderFillRequest {
	return request.order.type === "RARIBLE_V2"
}

async function fillOrderV2(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	request: RaribleV2OrderFillRequest,
): Promise<EthereumTransaction> {
	const address = toAddress(await ethereum.getFrom())
	const orderRight = {
		...invertOrder(request.order, toBn(request.amount), address),
		data: {
			...request.order.data,
			payouts: request.payouts || [],
			originFees: request.originFees || [],
		},
	}
	return matchOrders(getMakeFee, ethereum, send, contract, request.order, orderRight)
}

async function matchOrders(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	left: SimpleRaribleV2Order,
	right: SimpleRaribleV2Order,
): Promise<EthereumTransaction> {
	const exchangeContract = createExchangeV2Contract(ethereum, contract)
	const method = exchangeContract.functionCall(
		"matchOrders",
		orderToStruct(ethereum, left),
		left.signature || "0x",
		orderToStruct(ethereum, right),
		right.signature || "0x",
	)
	return send(method, getMatchV2Options(left, right, getMakeFee))
}

function getMatchV2Options(
	left: SimpleRaribleV2Order, right: SimpleRaribleV2Order, getMakeFee: GetMakeFeeFunction,
): EthereumSendOptions {
	if (left.make.assetType.assetClass === "ETH" && left.salt === ZERO) {
		return { value: getRealValue(getMakeFee, left) }
	} else if (right.make.assetType.assetClass === "ETH" && right.salt === ZERO) {
		return { value: getRealValue(getMakeFee, right) }
	} else {
		return {}
	}
}

async function fillOrderV1(
	ethereum: Ethereum,
	send: SendFunction,
	orderApi: OrderControllerApi,
	contract: Address,
	request: LegacyOrderFillRequest,
): Promise<EthereumTransaction> {
	const data = request.order.data
	if (data.dataType !== "LEGACY") {
		throw new Error(`Not supported data type: ${data.dataType}`)
	}
	const buyerFeeSig = await orderApi.buyerFeeSignature(
		{ fee: request.originFee, orderForm: fromSimpleOrderToOrderForm(request.order) },
	)
	const buyer = toAddress(await ethereum.getFrom())
	const orderRight = invertOrder(request.order, toBn(request.amount), buyer)
	const exchangeContract = createExchangeV1Contract(ethereum, contract)

	const method = exchangeContract.functionCall(
		"exchange",
		toStructLegacyOrder(request.order),
		toVrs(request.order.signature!),
		request.originFee,
		toVrs(buyerFeeSig),
		orderRight.take.value,
		request.payout ?? ZERO_ADDRESS,
	)

	return send(method, getMatchV1Options(request.order, orderRight, request.originFee))
}

function getMatchV1Options(
	order: SimpleLegacyOrder, orderRight: SimpleLegacyOrder, fee: number,
): EthereumSendOptions {
	if (order.take.assetType.assetClass === "ETH") {
		const makeAsset = getAssetWithFee(orderRight.make, fee)
		return { value: makeAsset.value }
	} else {
		return {}
	}
}

function getAssetWithFee(asset: Asset, fee: number) {
	if (asset.assetType.assetClass === "ETH" || asset.assetType.assetClass === "ERC20") {
		return addFee(asset, fee)
	} else {
		return asset
	}
}

function fromSimpleOrderToOrderForm(order: SimpleLegacyOrder): LegacyOrderForm {
	return {
		...order,
		salt: toBigNumber(toBn(order.salt).toString()),
	}
}

function toVrs(sig: string) {
	const sig0 = sig.startsWith("0x") ? sig.substring(2) : sig
	const r = "0x" + sig0.substring(0, 64)
	const s = "0x" + sig0.substring(64, 128)
	const v = parseInt(sig0.substring(128, 130), 16)
	return { r, v: v < 27 ? v + 27 : v, s }
}

function getRealValue(getMakeFee: GetMakeFeeFunction, order: SimpleOrder) {
	const fee = getMakeFee(order)
	const make = addFee(order.make, fee)
	return make.value
}

const ZERO = toWord("0x0000000000000000000000000000000000000000000000000000000000000000")
