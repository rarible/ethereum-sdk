import { Asset, LegacyOrderForm, OrderControllerApi, Part } from "@rarible/protocol-api-client"
import { Address, toAddress, toBigNumber, toWord, ZERO_ADDRESS } from "@rarible/types"
import { ActionBuilder } from "@rarible/action"
import { toBn } from "@rarible/utils/build/bn"
import { Ethereum, EthereumSendOptions } from "@rarible/ethereum-provider"
import { ExchangeAddresses } from "../config/type"
import { SendFunction } from "../common/send-transaction"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { orderToStruct, SimpleLegacyOrder, SimpleOrder, SimpleRaribleV2Order } from "./sign-order"
import { invertOrder } from "./invert-order"
import { addFee } from "./add-fee"
import { GetMakeFeeFunction } from "./get-make-fee"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { toStructLegacyOrder } from "./to-struct-legacy-order"
import { ApproveFunction } from "./approve"

export type FillOrderRequest = {
	amount: number
	payouts?: Array<Part>
	originFees?: Array<Part>
	infinite?: boolean
}

export type FillOrderAction = ActionBuilder<FillOrderStageId, void, [void, string]>
export type FillOrderStageId = "approve" | "send-tx"

export async function fillOrder(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	orderApi: OrderControllerApi,
	approve: ApproveFunction,
	config: ExchangeAddresses,
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<FillOrderAction> {
	const makeAsset = getMakeAssetV2(getMakeFee, order, request.amount)
	const approveAndWait = async () => {
		const tx = await approve(order.maker, makeAsset, Boolean(request.infinite))
		if (tx !== undefined) {
			await tx.wait()
		}
	}
	return ActionBuilder
		.create({ id: "approve" as const, run: () => approveAndWait() })
		.thenStage({
			id: "send-tx" as const,
			run: () => fillOrderSendTx(getMakeFee, ethereum, send, config, orderApi, order, request),
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
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<string> {
	switch (order.type) {
		case "RARIBLE_V1": {
			return fillOrderV1(ethereum, send, orderApi, config.v1, order, request)
		}
		case "RARIBLE_V2": {
			return fillOrderV2(getMakeFee, ethereum, send, config.v2, order, request)
		}
		default: {
			throw new Error(`Unsupported type: ${order.type}`)
		}
	}
}

async function fillOrderV2(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	order: SimpleRaribleV2Order,
	request: FillOrderRequest,
): Promise<string> {
	const address = toAddress(await ethereum.getFrom())
	const orderRight = {
		...invertOrder(order, toBn(request.amount), address),
		data: {
			...order.data,
			payouts: request.payouts || [],
			originFees: request.originFees || [],
		},
	}
	return matchOrders(getMakeFee, ethereum, send, contract, order, orderRight)
}

async function matchOrders(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	left: SimpleRaribleV2Order,
	right: SimpleRaribleV2Order,
): Promise<string> {
	const exchangeContract = createExchangeV2Contract(ethereum, contract)
	let options: EthereumSendOptions
	if (left.make.assetType.assetClass === "ETH" && left.salt === ZERO) {
		options = { value: getRealValue(getMakeFee, left) }
	} else if (right.make.assetType.assetClass === "ETH" && right.salt === ZERO) {
		options = { value: getRealValue(getMakeFee, right) }
	} else {
		options = {}
	}
	const tx = await send(exchangeContract
		.functionCall(
			"matchOrders",
			orderToStruct(ethereum, left),
			left.signature || "0x",
			orderToStruct(ethereum, right),
			right.signature || "0x",
		), options)
	return tx.hash
}

async function fillOrderV1(
	ethereum: Ethereum,
	send: SendFunction,
	orderApi: OrderControllerApi,
	contract: Address,
	order: SimpleLegacyOrder,
	request: FillOrderRequest,
): Promise<string> {
	const getAssetWithFee = (asset: Asset, fee: number) => {
		if (asset.assetType.assetClass === "ETH" || asset.assetType.assetClass === "ERC20") {
			return addFee(asset, fee)
		} else {
			return asset
		}
	}

	const data = order.data
	if (data.dataType !== "LEGACY") {
		throw new Error(`Not supported data type: ${data.dataType}`)
	}
	const fee = (request.originFees || []).map(f => f.value).reduce((s, f) => s + f, 0)
	const buyerFeeSig = await orderApi.buyerFeeSignature({ fee, orderForm: fromSimpleOrderToOrderForm(order) })
	const buyer = toAddress(await ethereum.getFrom())
	const orderRight = invertOrder(order, toBn(request.amount), buyer)

	let options: EthereumSendOptions
	if (order.take.assetType.assetClass === "ETH") {
		const makeAsset = getAssetWithFee(orderRight.make, fee)
		options = { value: makeAsset.value }
	} else {
		options = {}
	}

	const exchangeContract = createExchangeV1Contract(
		ethereum,
		contract,
	)
	const tx = await send(exchangeContract.functionCall(
		"exchange",
		toStructLegacyOrder(order),
		toVrs(order.signature!),
		fee,
		toVrs(buyerFeeSig),
		orderRight.take.value,
		getSingleBuyer(request.payouts),
	), options)
	return tx.hash
}

function getSingleBuyer(payouts?: Array<Part>): Address {
	if (payouts && payouts.length > 1) {
		return payouts[0].account
	} else {
		return ZERO_ADDRESS
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
