import { Part } from "@rarible/protocol-api-client"
import { Address, toAddress, toBigNumber } from "@rarible/types"
import Web3 from "web3"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { orderToStruct, SimpleOrder } from "./sign-order"
import { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { invertOrder } from "./invert-order"

const protocolCommission = toBigNumber('0')//todo impl

export type FillOrderRequest = {
	amount: number,
	payouts: Array<Part>,
	originFees: Array<Part>,
}

export async function fillOrder(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
	contract: Address,
	order: SimpleOrder,
	request: FillOrderRequest,
): Promise<string | undefined> {
	switch (order.type) {
		// case 'RARIBLE_V1': {
		//     return (() => '')();
		// }
		case 'RARIBLE_V2': {
			return await fillOrderV2(
				sendTx,
				web3,
				contract,
				order,
				request,
			)
		}
	}
	return undefined
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
	return await matchOrders(sendTx, web3, contract, order, orderRight, toAddress(address))
}

async function matchOrders(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
	exchangeV2Address: Address,
	left: SimpleOrder,
	right: SimpleOrder,
	sender: Address,
): Promise<string> {
	const exchangeContract = createExchangeV2Contract(web3, exchangeV2Address)
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
