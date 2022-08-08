import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer"
import type { MessageTypeProperty } from "@rarible/ethereum-provider/src"
import { toBn } from "@rarible/utils/build/bn"
import type { Address, Asset, AssetType } from "@rarible/ethereum-api-client"
import { encodeOrderParams } from "@looksrare/sdk"
import { ethers } from "ethers"
import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { BigNumber, BigNumberValue } from "@rarible/utils"
import {
	Erc1155AssetType,
	Erc1155LazyAssetType,
	Erc721AssetType,
	Erc721LazyAssetType,
} from "@rarible/ethereum-api-client"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { getRequiredWallet } from "../../common/get-required-wallet"
import { EIP712_ORDER_TYPES } from "../eip712"
import { createLooksrareExchange } from "../contracts/looksrare-exchange"
import { waitTx } from "../../common/wait-tx"
import { approve } from "../approve"
import { approveErc721 } from "../approve-erc721"
import { approveErc20 } from "../approve-erc20"
import { toVrs } from "../../common/to-vrs"
import { createExchangeWrapperContract } from "../contracts/exchange-wrapper"
import { prepareForExchangeWrapperFees } from "../../common/prepare-fee-for-exchange-wrapper"
import { id32 } from "../../common/id"
import type { SimpleOrder } from "../types"
import type { SimpleLooksrareOrder } from "../types"
import { isNft } from "../is-nft"
import { addressesByNetwork } from "./looksrare-utils/constants"
import type { MakerOrder, MakerOrderWithVRS, TakerOrder } from "./looksrare-utils/types"
import type { SupportedChainId } from "./looksrare-utils/types"
import type { LooksrareOrderFillRequest } from "./types"
import { ExchangeWrapperOrderType } from "./types"
import type { TakerOrderWithEncodedParams } from "./looksrare-utils/types"

export class LooksrareOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
	) {}

	cancelOrder(nonce: number) {
		const provider = getRequiredWallet(this.ethereum)

		if (!this.config.exchange.looksrare) {
			throw new Error(`Looksrare contract did not specified for chainId=${this.config.chainId}`)
		}

		const contract = createLooksrareExchange(provider, this.config.exchange.looksrare)

		return this.send(
			contract.functionCall("cancelMultipleMakerOrders", [nonce])
		)
	}

	isMakeNft(make: AssetType) {
		return isNft(make) || isNft(make)
	}

	convertMakerOrderToLooksrare(makerOrder: SimpleLooksrareOrder): MakerOrderWithVRS {
		const {take, make} = makerOrder
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
			amount: make.value,
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
	// async fulfillOrder(makerOrder: MakerOrder & { signature: string }, request: LooksrareOrderFillRequest) {
	async fulfillOrder(request: LooksrareOrderFillRequest) {
		// if (makerOrder.currency !== ZERO_ADDRESS) {
		// 	throw new Error("Order has non-ETH currency")
		// }
		const makerOrder = request.order
		const provider = getRequiredWallet(this.ethereum)

		const askWithoutHash = this.convertMakerOrderToLooksrare(makerOrder)

		const takerOrder: TakerOrderWithEncodedParams = {
			isOrderAsk: false,
			taker: await provider.getFrom(),
			price: askWithoutHash.price,
			tokenId: askWithoutHash.tokenId,
			minPercentageToAsk: askWithoutHash.minPercentageToAsk,
			params: askWithoutHash.params,
		}

		const chainId = await provider.getChainId()
		const addresses = addressesByNetwork[chainId as SupportedChainId]
		const contract = createExchangeWrapperContract(provider, this.config.exchange.wrapper)

		const originFeesPrepared = prepareForExchangeWrapperFees(request.originFees || [])

		const fulfillData = this.getFulfillWrapperData(askWithoutHash, takerOrder)

		const data = {
			marketId: ExchangeWrapperOrderType.LOOKSRARE_ORDERS,
			amount: askWithoutHash.price,
			data: fulfillData,
		}
		console.log("end data", JSON.stringify(data, null, "  "))
		const feesValueInBasisPoints = request.originFees?.reduce((acc, part) => {
			return acc += part.value
		}, 0) || 0
		const feesValue = toBn(feesValueInBasisPoints)
			.dividedBy(10000)
			.multipliedBy(data.amount)
			.integerValue(BigNumber.ROUND_FLOOR)
		const valueForSending = feesValue.plus(data.amount)
		console.log("before fulfill tx", valueForSending.toString())
		return this.send(
			contract.functionCall("singlePurchase", data, originFeesPrepared),
			{ value: valueForSending.toString() }
		)
	}

	getFulfillWrapperData(makerOrder: MakerOrderWithVRS, takerOrder: TakerOrderWithEncodedParams) {
		const provider = getRequiredWallet(this.ethereum)

		const takerOrderData = {
			isOrderAsk: takerOrder.isOrderAsk,
			// taker: takerOrder.taker,
			taker: this.config.exchange.wrapper,
			price: takerOrder.price,
			tokenId: takerOrder.tokenId,
			minPercentageToAsk: takerOrder.minPercentageToAsk,
			// params: "0x",
			params: takerOrder.params,
		}
		console.log("takerOrderData", JSON.stringify(takerOrderData, null, "  "))

		const typeNft = id32("ERC721").substring(0, 10)

		return encodeLooksRareData(
			provider,
			makerOrder,
			takerOrderData,
			typeNft
		)
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
