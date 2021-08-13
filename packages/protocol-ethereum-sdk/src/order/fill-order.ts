import { Asset, Part } from "@rarible/protocol-api-client"
import { Address, toBigNumber, ZERO_ADDRESS } from "@rarible/types"
import { Action, ActionBuilder } from "@rarible/action"
import { Ethereum } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types/build/address"
import { ExchangeAddresses } from "../config/type"
import { toBn } from "../common/to-bn"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { orderToStruct, SimpleOrder } from "./sign-order"
import { invertOrder } from "./invert-order"

const protocolCommission = toBigNumber('0')//todo impl

export type FillOrderRequest = {
	amount: number,
	payouts?: Array<Part>,
	originFees?: Array<Part>,
	infinite?: boolean
}

export type FillOrderStageId = "approve" | "send-tx"

export type FillOrderFunction = () => Promise<Action<FillOrderStageId, [string | undefined, string]>>

export async function fillOrder(
	ethereum: Ethereum,
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string | undefined>,
	config: ExchangeAddresses,
	order: SimpleOrder,
	request: FillOrderRequest,
) {
	//todo add commissions to approve (on top of ERC-20 and ETH)
	const makeAsset = getMakeAssetV2(order, request.amount)
	return ActionBuilder.create<FillOrderStageId>()
		.then({ id: "approve", run: () => approve(order.maker, makeAsset, Boolean(request.infinite)) })
		.then({ id: "send-tx", run: () => fillOrderSendTx(ethereum, config, order, request) })
		.build()
}

function getMakeAssetV2(order: SimpleOrder, amount: number) {
	const inverted = invertOrder(order, toBn(amount), ZERO_ADDRESS)
	return inverted.make
}

export async function fillOrderSendTx(
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
	return await matchOrders(ethereum, contract, order, orderRight, address)
}

async function matchOrders(
	ethereum: Ethereum,
	contract: Address,
	left: SimpleOrder,
	right: SimpleOrder,
	sender: Address,
): Promise<string> {
	const exchangeContract = createExchangeV2Contract(ethereum, contract)
	const tx = await exchangeContract.functionCall(
		"matchOrders",
		orderToStruct(left),
		left.signature || "0x",
		orderToStruct(right),
		right.signature || "0x",
	).send({ ...left.make.assetType.assetClass === "ETH" ? { value: left.take.value } : {} })
	console.log('tx', tx)
	return tx.hash
}
