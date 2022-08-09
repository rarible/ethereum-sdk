import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import { toBn } from "@rarible/utils/build/bn"
import type { Address, AssetType } from "@rarible/ethereum-api-client"
import { ZERO_ADDRESS } from "@rarible/types"
import type { BigNumberValue } from "@rarible/utils"
import { BigNumber } from "@rarible/utils"
import type { EthereumTransaction } from "@rarible/ethereum-provider"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { getRequiredWallet } from "../../common/get-required-wallet"
import { toVrs } from "../../common/to-vrs"
import { createExchangeWrapperContract } from "../contracts/exchange-wrapper"
import { id32 } from "../../common/id"
import type { SimpleLooksrareOrder, SimpleOrder} from "../types"
import { isNft } from "../is-nft"
import { encodePartToBuffer } from "../encode-data"
import type { MakerOrderWithVRS } from "./looksrare-utils/types"
import type { LooksrareOrderFillRequest, OrderFillSendData } from "./types"
import { ExchangeWrapperOrderType } from "./types"
import type { TakerOrderWithEncodedParams } from "./looksrare-utils/types"

export class LooksrareOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
	) {}

	convertMakerOrderToLooksrare(makerOrder: SimpleLooksrareOrder, amount: BigNumberValue): MakerOrderWithVRS {
		const {take, make} = makerOrder
		if (toBn(amount).gt(make.value)) {
			throw new Error(`Amount should be less or equal to ${make.value.toString()}`)
		}
		let isOrderAsk: boolean
		let contract: Address
		let tokenId: string
		if (isNft(make.assetType) || isNft(make.assetType)) {
			isOrderAsk = true
			contract = make.assetType.contract
			tokenId = make.assetType.tokenId.toString()
		} else {
			throw new Error(`Only sell orders are supported. Make=${make.assetType.assetClass} is not NFT`)
		}

		let currency: Address
		if (take.assetType.assetClass === "ETH") {
			currency = ZERO_ADDRESS
		} else if (take.assetType.assetClass === "ERC20") {
			currency = take.assetType.contract
		} else {
			throw new Error("Take asset should be ETH or ERC-20 contract")
		}

		if (!makerOrder.signature) {
			throw new Error("Signature is null")
		}
		const vrs = toVrs(makerOrder.signature || "0x")

		return {
			isOrderAsk,
			signer: makerOrder.maker,
			collection: contract,
			price: take.value,
			tokenId: tokenId,
			amount,
			strategy: makerOrder.data.strategy,
			currency,
			nonce: makerOrder.data.nonce,
			startTime: makerOrder.start || 0,
			endTime: makerOrder.end || 0,
			minPercentageToAsk: makerOrder.data.minPercentageToAsk,
			params: makerOrder.data.params || "0x",
			...vrs,
		}
	}

	async sendTransaction(request: LooksrareOrderFillRequest): Promise<EthereumTransaction> {
		const {functionCall, options} = await this.getTransactionData(request)
		return this.send(functionCall, options)
	}

	async getTransactionData(request: LooksrareOrderFillRequest): Promise<OrderFillSendData> {
		if (request.originFees && request.originFees.length > 2) {
			throw new Error("Origin fees recipients shouldn't be greater than 2")
		}
		const makerOrder = request.order
		const provider = getRequiredWallet(this.ethereum)

		const askWithoutHash = this.convertMakerOrderToLooksrare(makerOrder, request.amount)

		askWithoutHash.currency = this.config.weth

		const contract = createExchangeWrapperContract(provider, this.config.exchange.wrapper)

		const fulfillData = this.getFulfillWrapperData(askWithoutHash, request.order.make.assetType.assetClass)

		const data = {
			marketId: ExchangeWrapperOrderType.LOOKSRARE_ORDERS,
			amount: askWithoutHash.price,
			data: fulfillData,
		}
		const feesValueInBasisPoints = request.originFees?.reduce((acc, part) => {
			return acc += part.value
		}, 0) || 0
		const feesValue = toBn(feesValueInBasisPoints)
			.dividedBy(10000)
			.multipliedBy(data.amount)
			.integerValue(BigNumber.ROUND_FLOOR)
		const valueForSending = feesValue.plus(data.amount)

		const functionCall = contract.functionCall(
			"singlePurchase",
			data,
			encodePartToBuffer(request.originFees?.[0]),
			encodePartToBuffer(request.originFees?.[1])
		)
		return {
			functionCall,
			options: { value: valueForSending.toString() },
		}
	}

	getFulfillWrapperData(makerOrder: MakerOrderWithVRS, assetClass: AssetType["assetClass"]) {
		const provider = getRequiredWallet(this.ethereum)

		const takerOrderData = {
			isOrderAsk: false,
			taker: this.config.exchange.wrapper,
			price: makerOrder.price,
			tokenId: makerOrder.tokenId,
			minPercentageToAsk: makerOrder.minPercentageToAsk,
			params: makerOrder.params,
		}

		const typeNft = id32(assetClass).substring(0, 10)

		return encodeLooksRareData(
			provider,
			makerOrder,
			takerOrderData,
			typeNft
		)
	}

	getBaseOrderFee() {
		return this.getBaseOrderFeeConfig("LOOKSRARE")
	}

	getOrderFee(order: SimpleLooksrareOrder): number {
		return 10000 - order.data.minPercentageToAsk
	}
}

export function encodeLooksRareData(
	ethereum: Ethereum,
	makerOrder: MakerOrderWithVRS,
	takerOrder: TakerOrderWithEncodedParams,
	typeNft: string
): string {
	const encoded = ethereum.encodeParameter(
		ORDERS_MATCH_TYPE,
		{ makerOrder, takerOrder, typeNft }
	)
	return `0x${encoded.slice(66)}`
}

const MAKER_ORDER_TYPE = {
	components: [
		{ name: "isOrderAsk", type: "bool" },
		{ name: "signer", type: "address" },
		{ name: "collection", type: "address" },
		{ name: "price", type: "uint256" },
		{ name: "tokenId", type: "uint256" },
		{ name: "amount", type: "uint256" },
		{ name: "strategy", type: "address" },
		{ name: "currency", type: "address" },
		{ name: "nonce", type: "uint256" },
		{ name: "startTime", type: "uint256" },
		{ name: "endTime", type: "uint256" },
		{ name: "minPercentageToAsk", type: "uint256" },
		{ name: "params", type: "bytes" },
		{ name: "v", type: "uint8" },
		{ name: "r", type: "bytes32" },
		{ name: "s", type: "bytes32" },
	],
	name: "makerOrder",
	type: "tuple",
}

const TAKER_ORDER_TYPE = {
	components: [
		{ name: "isOrderAsk", type: "bool" },
		{ name: "taker", type: "address" },
		{ name: "price", type: "uint256" },
		{ name: "tokenId", type: "uint256" },
		{ name: "minPercentageToAsk", type: "uint256" },
		{ name: "params", type: "bytes" },
	],
	name: "takerOrder",
	type: "tuple",
}

const ORDERS_MATCH_TYPE = {
	components: [
		TAKER_ORDER_TYPE,
		MAKER_ORDER_TYPE,
		{ name: "typeNft", type: "bytes4"},
	],
	name: "data",
	type: "tuple",
}
