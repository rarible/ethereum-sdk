import { Asset, LegacyOrderForm, OrderControllerApi, Part } from "@rarible/protocol-api-client"
import { Address, toAddress, toBigNumber, toWord, ZERO_ADDRESS } from "@rarible/types"
import { ActionBuilder } from "@rarible/action"
import { BigNumber, toBn } from "@rarible/utils"
import type { Ethereum, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import type { Config } from "../config/type"
import type { OpenSeaOrderToSignDTO } from "../common/orders"
import { OrderOpenSeaV1DataV1FeeMethod } from "../common/orders"
import type { SendFunction } from "../common/send-transaction"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import {
	convertOpenSeaOrderToSignDTO,
	orderToStruct,
	SimpleLegacyOrder,
	SimpleOpenSeaV1Order,
	SimpleOrder,
	SimpleRaribleV2Order,
} from "./sign-order"
import { invertOrder } from "./invert-order"
import { addFee } from "./add-fee"
import type { GetMakeFeeFunction } from "./get-make-fee"
import { getFeeOpenseaV1 } from "./get-make-fee"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { toStructLegacyOrder } from "./to-struct-legacy-order"
import { createOpenseaContract } from "./contracts/exchange-opensea-v1"
import { approveOpensea } from "./approve-opensea"
import { approve } from "./approve"

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
	config: Config,
	request: FillOrderRequest,
): Promise<FillOrderAction> {
	const approveAndWait = async () => {
		let tx: EthereumTransaction | undefined

		if (request.order.type === "OPEN_SEA_V1") {
			const asset = getOpenseaAssetV1(request.order)
			console.log("fillOrder: asset for approve", asset)
			tx = await approveOpensea(
				ethereum,
				send,
				config,
				toAddress(await ethereum.getFrom()),
				asset,
				false
			)
		} else {
			const makeAsset = getMakeAssetV2(getMakeFee, request.order, request.amount)
			tx = await approve(
				ethereum,
				send,
				config.transferProxies,
				request.order.maker,
				makeAsset,
				Boolean(request.infinite)
			)
		}

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

export function getOpenseaAssetV1(order: SimpleOpenSeaV1Order): Asset {
	let asset: Asset = order.take

	if (order.data.feeMethod === "SPLIT_FEE") {
		const takerRelayerFee = toBn(asset.value)
			.multipliedBy(order.data.takerRelayerFee)
			.dividedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)

		const takerProtocolFee = toBn(asset.value)
			.multipliedBy(order.data.takerProtocolFee)
			.dividedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)

		const amount = toBn(asset.value)
			.plus(takerRelayerFee)
			.plus(takerProtocolFee)

		return {
			...asset,
			value: toBigNumber(amount.toFixed()),
		}

	} else if (order.data.feeMethod === "PROTOCOL_FEE") {
		const value = toBn(asset.value)
			.plus(order.data.takerRelayerFee)
			.plus(order.data.takerProtocolFee)

		return {
			...asset,
			value: toBigNumber(value.toFixed()),
		}
	} else {
		throw new Error("Unrecognized order feeMethod")
	}
}

export async function fillOrderSendTx(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	config: Config,
	orderApi: OrderControllerApi,
	request: FillOrderRequest,
): Promise<EthereumTransaction> {
	if (isLegacyRequest(request)) {
		return fillOrderV1(ethereum, send, orderApi, config.exchange.v1, request)
	}
	if (isOrderV2Request(request)) {
		return fillOrderV2(getMakeFee, ethereum, send, config.exchange.v2, request)
	}
	if (isOpenseaOrderV1Request(request)) {
		return fillOrderOpenSea(getMakeFee, ethereum, send, config, request)
	}

	throw new Error(`Unsupported type: ${request.order.type}`)
}

function isLegacyRequest(request: FillOrderRequest): request is LegacyOrderFillRequest {
	return request.order.type === "RARIBLE_V1"
}

function isOrderV2Request(request: FillOrderRequest): request is RaribleV2OrderFillRequest {
	return request.order.type === "RARIBLE_V2"
}

function isOpenseaOrderV1Request(request: FillOrderRequest): request is RaribleV2OrderFillRequest {
	return request.order.type === "OPEN_SEA_V1"
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

export async function fillOrderOpenSea(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	config: Config,
	request: OpenSeaV1OrderFillRequest,
): Promise<EthereumTransaction> {
	const from = toAddress(await ethereum.getFrom())
	const { buy, sell } = await getOpenseaOrdersForMatching(
		ethereum,
		request.order,
		request.amount,
		from,
		config.feeRecipients.openseaV1,
	)
	return matchOpenSeaV1Order(getMakeFee, ethereum, send, config.exchange.openseaV1, sell, buy)
}

export async function matchOpenSeaV1Order(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	exchange: Address,
	sell: SimpleOpenSeaV1Order,
	buy: SimpleOpenSeaV1Order,
) {
	const sellOrderToSignDTO = convertOpenSeaOrderToSignDTO(ethereum, sell)
	const buyOrderToSignDTO = convertOpenSeaOrderToSignDTO(ethereum, buy)

	const exchangeContract = createOpenseaContract(ethereum, exchange)

	const buyVRS = toVrs(buy.signature || "")
	const sellVRS = toVrs(sell.signature || "")

	const method = exchangeContract.functionCall(
		"atomicMatch_",
		[
			...getAtomicMatchArgAddresses(buyOrderToSignDTO),
			...getAtomicMatchArgAddresses(sellOrderToSignDTO),
		],
		[...getAtomicMatchArgUints(buyOrderToSignDTO), ...getAtomicMatchArgUints(sellOrderToSignDTO)],
		[...getAtomicMatchArgCommonData(buyOrderToSignDTO), ...getAtomicMatchArgCommonData(sellOrderToSignDTO)],
		buyOrderToSignDTO.calldata,
		sellOrderToSignDTO.calldata,
		buyOrderToSignDTO.replacementPattern,
		sellOrderToSignDTO.replacementPattern,
		buyOrderToSignDTO.staticExtradata,
		sellOrderToSignDTO.staticExtradata,
		[buyVRS.v, sellVRS.v],
		[buyVRS.r, buyVRS.s, sellVRS.r, sellVRS.s, "0x0000000000000000000000000000000000000000000000000000000000000000"],
	)

	const calculatedPrice = await exchangeContract
		.functionCall(
			"calculateCurrentPrice_",
			getAtomicMatchArgAddresses(buyOrderToSignDTO),
			getAtomicMatchArgUints(buyOrderToSignDTO),
			buyOrderToSignDTO.feeMethod,
			buyOrderToSignDTO.side,
			buyOrderToSignDTO.saleKind,
			buyOrderToSignDTO.howToCall,
			buyOrderToSignDTO.calldata,
			buyOrderToSignDTO.replacementPattern,
			buyOrderToSignDTO.staticExtradata
		)
		.call()
	// console.log("calculated price", calculatedPrice)
	const from = toAddress(await ethereum.getFrom())
	// debugger
	const options = await getMatchOpenseaOptions(buy, sell)
	console.log("buy", buyOrderToSignDTO)
	console.log("sell", sellOrderToSignDTO)
	console.log("options", options)
	return send(method, options)
	// return send(method, await getMatchOpenseaOptions(buyOrderToSignDTO, sellOrderToSignDTO, from))
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

export function toVrs(sig: string) {
	const sig0 = sig.startsWith("0x") ? sig.substring(2) : sig
	const r = "0x" + (sig0.substring(0, 64) || ZERO.substring(2))
	const s = "0x" + (sig0.substring(64, 128) || ZERO.substring(2))
	let v = parseInt(sig0.substring(128, 130), 16) || 0
	return { r, v: v < 27 ? v + 27 : v, s }
}

function getRealValue(getMakeFee: GetMakeFeeFunction, order: SimpleOrder) {
	const fee = getMakeFee(order)
	const make = addFee(order.make, fee)
	return make.value
}

export async function getOpenseaOrdersForMatching(
	ethereum: Ethereum,
	order: SimpleOpenSeaV1Order,
	amount: number,
	from: Address,
	defaultFeeRecipient: Address
) {
	let buy: SimpleOpenSeaV1Order, sell: SimpleOpenSeaV1Order

	const inverted = {
		...order,
		make: {
			...order.take,
		},
		take: {
			...order.make,
		},
		maker: from,
		taker: order.maker,
		signature: undefined,
	}
	const feeRecipient = order.data.feeRecipient === ZERO_ADDRESS ? defaultFeeRecipient : ZERO_ADDRESS

	switch (order.data.side) {
		case "SELL": {
			sell = { ...order }
			buy = {
				...inverted,
				data: { ...order.data, feeRecipient, side: "BUY" },
			}
			break
		}
		case "BUY": {
			buy = { ...order }
			sell = {
				...inverted,
				data: { ...order.data, feeRecipient, side: "SELL" },
			}
			break
		}
		default: {
			throw new Error("Unrecognized order side")
		}
	}

	// debugger

	return { buy, sell }
}

export function getAtomicMatchArgAddresses(dto: OpenSeaOrderToSignDTO) {
	return [dto.exchange, dto.maker, dto.taker, dto.feeRecipient, dto.target, dto.staticTarget, dto.paymentToken]
}

export function getAtomicMatchArgUints(dto: OpenSeaOrderToSignDTO) {
	return [
		dto.makerRelayerFee,
		dto.takerRelayerFee,
		dto.makerProtocolFee,
		dto.takerProtocolFee,
		dto.basePrice,
		dto.extra,
		dto.listingTime,
		dto.expirationTime,
		dto.salt,
	]
}

export function getAtomicMatchArgCommonData(dto: OpenSeaOrderToSignDTO) {
	return [dto.feeMethod, dto.side, dto.saleKind, dto.howToCall]
}
/*
async function getMatchOpenseaOptions(
	buy: SimpleOpenSeaV1Order,
	sell: SimpleOpenSeaV1Order,
	from: Address,
): Promise<EthereumSendOptions> {
	let matchOptions: EthereumSendOptions = {}
	if (buy.maker.toLowerCase() === from.toLowerCase() && buy.take.assetType.assetClass === "ETH") {
		const value = toBn(buy.make.value)
			.multipliedBy(+buy.data.takerRelayerFee + 10000)
			.dividedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)

		// matchOptions.value = value.toString()

		// const takerRelayerFee = toBn(buy.data.takerRelayerFee)
		// const feePercentage = takerRelayerFee.div(10000)
		// const fee = feePercentage.times(buy.make.value)

		// matchOptions.value = fee.plus(buy.make.value).integerValue(BigNumber.ROUND_FLOOR).toFixed()
		matchOptions.value = toBigNumber(value.toFixed())
		console.log(" buy maker getMatchOpenseaOptions", matchOptions.value)


	}

	if (sell.maker.toLowerCase() === from.toLowerCase() && sell.take.assetType.assetClass === "ETH") {

		const value = toBn(sell.take.value)
			.multipliedBy(+buy.data.takerRelayerFee + 10000)
			.dividedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)
		//
		// const takerRelayerFee = toBn(sell.data.takerRelayerFee)
		// const feePercentage = takerRelayerFee.div(10000)
		// const fee = feePercentage.times(sell.take.value)
		// matchOptions.value = fee.integerValue(BigNumber.ROUND_FLOOR).toFixed()

		// const takerRelayerFee = (+sell.data.takerRelayerFee * +sell.make.value / 10000) + 1
		// toBn(sell.data.takerRelayerFee)
		// 	.times(sell.take.value)
		// 	.div(10000)
		// const feePercentage = takerRelayerFee.div(10000)
		// matchOptions.value = takerRelayerFee.integerValue(BigNumber.ROUND_FLOOR).toFixed()
		// matchOptions.value = takerRelayerFee.toFixed()
		// matchOptions.value = takerRelayerFee.toFixed()

		// matchOptions.value = fee.plus(sell.take.value).integerValue(BigNumber.ROUND_FLOOR).toFixed()
		// matchOptions.value = fee.integerValue(BigNumber.ROUND_FLOOR).toFixed()

		// matchOptions.value = buy.basePrice + buy.takerRelayerFee
		matchOptions.value = toBigNumber(value.toFixed())
		console.log(" sell maker getMatchOpenseaOptions", matchOptions.value, "make", sell.make, "take", sell.take)


	}
	debugger

	return matchOptions
}


 */


async function getMatchOpenseaOptions(
	buy: SimpleOpenSeaV1Order,
	sell: SimpleOpenSeaV1Order,
): Promise<EthereumSendOptions> {
	let matchOptions: EthereumSendOptions = {}

	if (buy.take.assetType.assetClass === "ETH") {
		return { value: getOpenseaAssetV1(buy).value }
	} else if (sell.take.assetType.assetClass === "ETH") {
		return { value: getOpenseaAssetV1(sell).value }
	} else {
		return {}
	}

	return matchOptions
}


/*
async function getMatchOpenseaOptions(
	buy: OpenSeaOrderToSignDTO,
	sell: OpenSeaOrderToSignDTO,
	from: Address
): Promise<EthereumSendOptions> {
	let matchOptions: EthereumSendOptions = {}
	if (buy.maker.toLowerCase() === from.toLowerCase() && buy.paymentToken === ZERO_ADDRESS) {
		const value = toBn(sell.basePrice)
			.multipliedBy(10000 + +buy.takerRelayerFee)
			.dividedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)

		if (buy.feeMethod === OrderOpenSeaV1DataV1FeeMethod.SPLIT_FEE) {

		} else if (buy.feeMethod === OrderOpenSeaV1DataV1FeeMethod.PROTOCOL_FEE) {

		}
		matchOptions.value = value.toFixed()
	}

	if (sell.maker.toLowerCase() === from.toLowerCase() && sell.paymentToken === ZERO_ADDRESS) {
		const value = toBn(sell.basePrice)
			.multipliedBy(buy.takerRelayerFee)
			.dividedBy(10000)
			.plus(sell.basePrice)
			.integerValue(BigNumber.ROUND_FLOOR)
		matchOptions.value = value.toFixed()
	}
	console.log("buy", buy, "sell", sell, "options", matchOptions)
	return matchOptions
}


 */

// function getRealOpenseaValue(order: SimpleOpenSeaV1Order) {
// 	const fee = getMakeFee(order)
// 	const make = addFee(order.make, fee)
// 	return make.value
// }


const ZERO = toWord("0x0000000000000000000000000000000000000000000000000000000000000000")
