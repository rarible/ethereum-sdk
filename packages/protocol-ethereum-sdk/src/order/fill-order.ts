import { Asset, Part } from "@rarible/protocol-api-client"
import { Address, toWord, ZERO_ADDRESS } from "@rarible/types"
import { Action, ActionBuilder } from "@rarible/action"
import { Ethereum, EthereumSendOptions } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types/build/address"
import { ExchangeAddresses } from "../config/type"
import { toBn } from "../common/to-bn"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { orderToStruct, SimpleOrder } from "./sign-order"
import { invertOrder } from "./invert-order"
import { addFee } from "./add-fee"
import { GetMakeFeeFunction } from "./get-make-fee"

export type FillOrderRequest = {
	amount: number,
	payouts?: Array<Part>,
	originFees?: Array<Part>,
	infinite?: boolean
}

export type FillOrderStageId = "approve" | "send-tx"

export type FillOrderFunction = () => Promise<Action<FillOrderStageId, [string | undefined, string]>>

export async function fillOrder(
	getMakeFee: GetMakeFeeFunction,
	ethereum: Ethereum,
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string | undefined>,
	config: ExchangeAddresses,
	order: SimpleOrder,
	request: FillOrderRequest,
) {
	const makeAsset = getMakeAssetV2(getMakeFee, order, request.amount)
	//todo we should wait for approve to be mined
	return ActionBuilder.create<FillOrderStageId>()
		.then({ id: "approve", run: () => approve(order.maker, makeAsset, Boolean(request.infinite)) })
		.then({ id: "send-tx", run: () => fillOrderSendTx(getMakeFee, ethereum, config, order, request) })
		.build()
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
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<string> {
	switch (order.type) {
		// case 'RARIBLE_V1': {
		//     return (() => '')();
		// }
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
		options = { }
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

function getRealValue(getMakeFee: GetMakeFeeFunction, order: SimpleOrder) {
	const fee = getMakeFee(order)
	const make = addFee(order.make, fee)
	return make.value
}

const ZERO = toWord("0x0000000000000000000000000000000000000000000000000000000000000000")
