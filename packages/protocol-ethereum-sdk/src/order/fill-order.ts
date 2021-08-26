import { Asset, OrderControllerApi, OrderForm, Part } from "@rarible/protocol-api-client"
import { Address, toWord, ZERO_ADDRESS } from "@rarible/types"
import { ActionBuilder } from "@rarible/action"
import { Ethereum, EthereumSendOptions } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types/build/address"
import { toBigNumber } from "@rarible/types/build/big-number"
import { ExchangeAddresses } from "../config/type"
import { toBn } from "../common/to-bn"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { orderToStruct, SimpleOrder } from "./sign-order"
import { invertOrder } from "./invert-order"
import { addFee } from "./add-fee"
import { GetMakeFeeFunction } from "./get-make-fee"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { toStructLegacyOrder } from "./to-struct-legacy-order"

export type FillOrderRequest = {
	amount: number,
	payouts?: Array<Part>,
	originFees?: Array<Part>,
	infinite?: boolean
}

export type FillOrderAction = ActionBuilder<string, void, [string | undefined, string]>
export type FillOrderStageId = "approve" | "send-tx"

export async function fillOrder(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	orderApi: OrderControllerApi,
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string | undefined>,
	config: ExchangeAddresses,
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<FillOrderAction> {
	const makeAsset = getMakeAssetV2(getMakeFee, order, request.amount)
	//todo we should wait for approve to be mined
	return ActionBuilder
		.create({ id: "approve" as const, run: () => approve(order.maker, makeAsset, Boolean(request.infinite)) })
		.thenStage({ id: "send-tx" as const, run: () => fillOrderSendTx(getMakeFee, ethereum, config, orderApi, order, request) })
}

function getMakeAssetV2(getMakeFee: GetMakeFeeFunction, order: SimpleOrder, amount: number) {
	const inverted = invertOrder(order, toBn(amount), ZERO_ADDRESS)
	const makeFee = getMakeFee(inverted)
	return addFee(inverted.make, makeFee)
}

export async function fillOrderSendTx(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	config: ExchangeAddresses,
	orderApi: OrderControllerApi,
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<string> {
	switch (order.type) {
		case 'RARIBLE_V1': {
			return await fillOrderV1(ethereum, orderApi, config.v1, order, request)
		}
		case 'RARIBLE_V2': {
			return await fillOrderV2(
				getMakeFee,
				ethereum,
				config.v2,
				order,
				request,
			)
		}
	}
	throw new Error(`Unsupported type: ${order.type}`)
}

async function fillOrderV2(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	contract: Address,
	order: SimpleOrder,
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
	return await matchOrders(getMakeFee, ethereum, contract, order, orderRight)
}

async function matchOrders(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	contract: Address,
	left: SimpleOrder,
	right: SimpleOrder,
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
	const tx = await exchangeContract.functionCall(
		"matchOrders",
		orderToStruct(left),
		left.signature || "0x",
		orderToStruct(right),
		right.signature || "0x",
	).send(options)
	return tx.hash
}

async function fillOrderV1(
	ethereum: Ethereum,
	orderApi: OrderControllerApi,
	contract: Address,
	order: SimpleOrder,
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

	const exchangeContract = createExchangeV1Contract(ethereum, contract)
	const tx = await exchangeContract.functionCall(
		"exchange",
		toStructLegacyOrder(order),
		toVrs(order.signature!),
		fee,
		toVrs(buyerFeeSig),
		orderRight.take.value,
		getSingleBuyer(request.payouts),
	).send(options)
	return tx.hash
}

function getSingleBuyer(payouts?: Array<Part>): Address {
	if (payouts && payouts.length > 1) {
		return payouts[0].account
	} else {
		return ZERO_ADDRESS
	}
}

function fromSimpleOrderToOrderForm(order: SimpleOrder) {
	return { ...order, salt: toBigNumber(order.salt) } as OrderForm
}

function toVrs(sig: string) {
	const sig0 = sig.startsWith("0x") ? sig.substring(2) : sig
	const r = "0x" + sig0.substring(0, 64)
	const s = "0x" + sig0.substring(64, 128)
	const v = parseInt(sig0.substring(128, 130), 16)
	return { r, v: (v < 27 ? v + 27 : v), s }
}


function getRealValue(getMakeFee: GetMakeFeeFunction, order: SimpleOrder) {
	const fee = getMakeFee(order)
	const make = addFee(order.make, fee)
	return make.value
}

const ZERO = toWord("0x0000000000000000000000000000000000000000000000000000000000000000")
