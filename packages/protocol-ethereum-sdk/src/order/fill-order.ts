import {
	Asset,
	LegacyOrderForm,
	OrderControllerApi,
	Part,
} from "@rarible/protocol-api-client"
import { Address, toAddress, toBigNumber, toWord, ZERO_ADDRESS } from "@rarible/types"
import { ActionBuilder } from "@rarible/action"
import {toBn} from "@rarible/utils"
import type {Ethereum, EthereumSendOptions, EthereumTransaction} from "@rarible/ethereum-provider"
import type { Config, OpenSeaOrderToSignDTO } from "../config/type"
import type { SendFunction } from "../common/send-transaction"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import {
	orderToStruct,
	SimpleLegacyOrder,
	SimpleOrder,
	SimpleRaribleV2Order,
	SimpleOpenSeaV1Order,
	convertOpenSeaOrderToSignDTO,
} from "./sign-order"
import { invertOrder } from "./invert-order"
import { addFee } from "./add-fee"
import type { GetMakeFeeFunction } from "./get-make-fee"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { toStructLegacyOrder } from "./to-struct-legacy-order"
import type { ApproveFunction } from "./approve"
import { createOpenseaContract } from "./contracts/exchange-opensea-v1"
import {createOpenseaProxyRegistryEthContract} from "./contracts/proxy-registry-opensea"
import {approveOpensea} from "./approve-opensea"

export type FillOrderRequest = {
	amount: number
	payouts?: Array<Part>
	originFees?: Array<Part>
	infinite?: boolean
}

export type FillOrderAction = ActionBuilder<FillOrderStageId, void, [void, EthereumTransaction]>
export type FillOrderStageId = "approve" | "send-tx"

export async function fillOrder(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	orderApi: OrderControllerApi,
	approve: ApproveFunction,
	config: Config,
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<FillOrderAction> {
	const makeAsset = getMakeAssetV2(getMakeFee, order, request.amount)
	const approveAndWait = async () => {
		let tx: EthereumTransaction | undefined

		if (order.type === "OPEN_SEA_V1") {
			tx = await approveOpensea(ethereum, send, config, order.maker, order.take, false)
		} else {
			tx = await approve(order.maker, makeAsset, Boolean(request.infinite))
		}

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
	config: Config,
	orderApi: OrderControllerApi,
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<EthereumTransaction> {
	switch (order.type) {
		case "RARIBLE_V1": {
			return fillOrderV1(ethereum, send, orderApi, config.exchange.v1, order, request)
		}
		case "RARIBLE_V2": {
			return fillOrderV2(getMakeFee, ethereum, send, config.exchange.v2, order, request)
		}
		case "OPEN_SEA_V1": {
			return fillOrderOpenSea(getMakeFee, ethereum, send, config.exchange.openseaV1, order, request)
		}
		default: {
			throw new Error(`Unsupported type: ${(order as any).type}`)
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
): Promise<EthereumTransaction> {
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

export async function getRegisteredProxy(
	ethereum: Ethereum,
	proxyRegistry: Address
): Promise<Address> {
	const proxyRegistryContract = createOpenseaProxyRegistryEthContract(ethereum, proxyRegistry)
	let proxyAddress = toAddress(await proxyRegistryContract.functionCall("proxies", await ethereum.getFrom()).call())

	if (proxyAddress === ZERO_ADDRESS) {
		await proxyRegistryContract.functionCall("registerProxy").send()
		proxyAddress = toAddress(await proxyRegistryContract.functionCall("proxies", await ethereum.getFrom()).call())
	}

	return proxyAddress
}

function getOpenseaOrdersForMatching(
	ethereum: Ethereum,
	order: SimpleOpenSeaV1Order,
	amount: number,
	buyer: Address
) {
	let buy: SimpleOpenSeaV1Order, sell: SimpleOpenSeaV1Order

	const inverted = invertOrder(order, toBn(amount), buyer, order.salt)
	const feeRecipient = order.data.feeRecipient === ZERO_ADDRESS ? buyer : ZERO_ADDRESS

	switch (order.data.side) {
		case "SELL": {
			sell = {...order, taker: ZERO_ADDRESS}
			buy = {
				...inverted,
				data: {...order.data, feeRecipient, side: "BUY"},
			}
			break
		}
		case "BUY": {
			buy = {...order, taker: ZERO_ADDRESS}
			sell = {
				...inverted,
				data: {...order.data, feeRecipient, side: "SELL"},
			}
			break
		}
		default: {
			throw new Error("Unrecognized order side")
		}
	}

	return {buy, sell}
}

export async function fillOrderOpenSea(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	exchange: Address,
	order: SimpleOpenSeaV1Order,
	request: FillOrderRequest,
): Promise<EthereumTransaction> {
	const from = toAddress(await ethereum.getFrom())
	const {buy, sell} = getOpenseaOrdersForMatching(ethereum, order, request.amount, from)
	return matchOpenSeaV1Order(getMakeFee, ethereum, send, exchange, sell, buy)
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

async function getMatchOpenseaOptions(
	buy: OpenSeaOrderToSignDTO,
	sell: OpenSeaOrderToSignDTO,
	from: Address
): Promise<EthereumSendOptions> {
	let matchOptions: EthereumSendOptions = {}
	if (buy.maker.toLowerCase() === from.toLowerCase() && buy.paymentToken === ZERO_ADDRESS) {
		matchOptions.value = buy.basePrice
	}

	if (sell.maker.toLowerCase() === from.toLowerCase() && sell.paymentToken === ZERO_ADDRESS) {
		matchOptions.value = buy.takerRelayerFee
	}

	return matchOptions
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

	const makerVRS = toVrs(sell.signature || buy.signature || "0x")

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
		[makerVRS.v, makerVRS.v],
		[makerVRS.r, makerVRS.s, makerVRS.r, makerVRS.s, "0x0000000000000000000000000000000000000000000000000000000000000000"],
	)

	// debugger
	const from = toAddress(await ethereum.getFrom())
	return send(method, await getMatchOpenseaOptions(buyOrderToSignDTO, sellOrderToSignDTO, from))
}

async function matchOrders(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	left: SimpleOrder,
	right: SimpleOrder,
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
	left: SimpleOrder, right: SimpleOrder, getMakeFee: GetMakeFeeFunction,
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
	order: SimpleLegacyOrder,
	request: FillOrderRequest,
): Promise<EthereumTransaction> {
	const data = order.data
	if (data.dataType !== "LEGACY") {
		throw new Error(`Not supported data type: ${data.dataType}`)
	}
	const fee = (request.originFees || []).map(f => f.value).reduce((s, f) => s + f, 0)
	const buyerFeeSig = await orderApi.buyerFeeSignature({ fee, orderForm: fromSimpleOrderToOrderForm(order) })
	const buyer = toAddress(await ethereum.getFrom())
	const orderRight = invertOrder(order, toBn(request.amount), buyer)
	const exchangeContract = createExchangeV1Contract(ethereum, contract)

	const method = exchangeContract.functionCall(
		"exchange",
		toStructLegacyOrder(order),
		toVrs(order.signature!),
		fee,
		toVrs(buyerFeeSig),
		orderRight.take.value,
		getSingleBuyer(request.payouts),
	)

	return send(method, getMatchV1Options(order, orderRight, fee))
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

export function toVrs(sig: string) {
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
