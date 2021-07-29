import { Asset, Part } from "@rarible/protocol-api-client"
import { Address, toAddress, toBigNumber } from "@rarible/types"
import Web3 from "web3"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { orderToStruct, SimpleOrder } from "./sign-order"
import { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { invertOrder } from "./invert-order"
import { ExchangeAddresses } from "../config/type"
import { Action, ActionBuilder } from "@rarible/action"

const protocolCommission = toBigNumber('0')//todo impl

export type FillOrderRequest = {
	amount: number,
	payouts: Array<Part>,
	originFees: Array<Part>,
	infinite?: boolean
}

export type FillOrderStageId = "approve" | "send-tx"

export type FillOrderFunction = () => Promise<Action<FillOrderStageId, [string | undefined, string]>>

export async function fillOrder(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	approve: (owner: Address, asset: Asset, infinite: boolean) => Promise<string | undefined>,
	web3: Web3,
	config: ExchangeAddresses,
	order: SimpleOrder,
	request: FillOrderRequest,
) {
	//todo add commissions to approve (on top of ERC-20 and ETH)
	return ActionBuilder.create<FillOrderStageId>()
		.then({ id: "approve", run: () => approve(order.maker, order.make, Boolean(request.infinite))})
		.then({ id: "send-tx", run: () => fillOrderSendTx(sendTx, web3, config, order, request) })
		.build()
}

export async function fillOrderSendTx(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
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
				sendTx,
				web3,
				config.v2,
				order,
				request,
			)
		}
	}
	throw new Error(`Unsupported type: ${order.type}`)
}

async function fillOrderV1(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
	contract: Address,
	order: SimpleOrder,
	request: FillOrderRequest
): Promise<string | undefined> {
	const [address] = await web3.eth.getAccounts()
	const orderRight = {
		...invertOrder(order, toAddress(address)),
		data: {
			...order.data,
			payouts: request.payouts,
			originFees: request.originFees,
		},
	}
}

async function fillOrderV2(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
	contract: Address,
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<string> {

	const [address] = await web3.eth.getAccounts()
	const orderRight = {
		...invertOrder(order, toAddress(address)),
		data: {
			...order.data,
			payouts: request.payouts,
			originFees: request.originFees,
		},
	}
	return await matchOrders(sendTx, web3, contract, order, orderRight, toAddress(address))
}

async function matchOrders(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
	contract: Address,
	left: SimpleOrder,
	right: SimpleOrder,
	sender: Address,
): Promise<string> {
	const exchangeContract = createExchangeV2Contract(web3, contract)
	return await sendTx(
		exchangeContract.methods.matchOrders(
			orderToStruct(left),
			left.signature || "0x",
			orderToStruct(right),
			right.signature || "0x",
		),
		{ from: sender },
	)
}
