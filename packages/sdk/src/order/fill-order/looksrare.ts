import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer"
import type { MessageTypeProperty } from "@rarible/ethereum-provider/src"
import { toBn } from "@rarible/utils/build/bn"
import type { Address, Asset, AssetType } from "@rarible/ethereum-api-client"
import { encodeOrderParams } from "@looksrare/sdk"
import { ethers } from "ethers"
import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { BigNumber } from "@rarible/utils"
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
import { addressesByNetwork } from "./looksrare-utils/constants"
import type { MakerOrder, MakerOrderWithVRS, TakerOrder } from "./looksrare-utils/types"
import type { SupportedChainId } from "./looksrare-utils/types"
import type { LooksrareV1OrderFillRequest } from "./types"
import { ExchangeWrapperOrderType } from "./types"

export class LooksrareOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
	) {}

	async fulfillOrder(makerOrder: MakerOrder & { signature: string }, request: LooksrareV1OrderFillRequest) {
		// if (makerOrder.currency !== ZERO_ADDRESS) {
		// 	throw new Error("Order has non-ETH currency")
		// }
		const provider = getRequiredWallet(this.ethereum)

		const { encodedParams } = encodeOrderParams(makerOrder.params)
		console.log("params", JSON.stringify(makerOrder.params, null, " "), JSON.stringify(encodedParams, null, " "))
		// const vrs = ethers.utils.splitSignature(makerOrder.signature)
		const vrs = toVrs(makerOrder.signature || "0x")

		const askWithoutHash: MakerOrderWithVRS = {
			...makerOrder,
			...vrs,
			params: encodedParams,
		}

		const takerOrder: TakerOrder = {
			isOrderAsk: false,
			taker: await provider.getFrom(),
			price: makerOrder.price,
			tokenId: makerOrder.tokenId,
			minPercentageToAsk: makerOrder.minPercentageToAsk,
			params: makerOrder.params,
		}

		const chainId = await provider.getChainId()
		const addresses = addressesByNetwork[chainId as SupportedChainId]
		const contract = createExchangeWrapperContract(provider, this.config.exchange.wrapper)

		const originFeesPrepared = prepareForExchangeWrapperFees(request.originFees || [])

		const fulfillData = this.getFulfillWrapperData(makerOrder, takerOrder)

		const data = {
			marketId: ExchangeWrapperOrderType.LOOKSRARE_ORDERS,
			amount: makerOrder.price,
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

	getFulfillWrapperData(makerOrder: MakerOrder & { signature: string }, takerOrder: TakerOrder) {
		const provider = getRequiredWallet(this.ethereum)

		const makerOrderSignatureVrs =  toVrs(makerOrder.signature || "0x")

		const makerOrderData = {
			isOrderAsk: makerOrder.isOrderAsk,
			signer: makerOrder.signer,
			collection: makerOrder.collection,
			price: makerOrder.price,
			tokenId: makerOrder.tokenId,
			amount: makerOrder.amount,
			strategy: makerOrder.strategy,
			currency: makerOrder.currency,
			nonce: makerOrder.nonce,
			startTime: makerOrder.startTime,
			endTime: makerOrder.endTime,
			minPercentageToAsk: makerOrder.minPercentageToAsk,
			params: makerOrder.params,
			// params: "0x",
			v: makerOrderSignatureVrs.v,
			r: makerOrderSignatureVrs.r,
			s: makerOrderSignatureVrs.s,
		}
		console.log("makerOrderData", JSON.stringify(makerOrderData, null, "  "))

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
			makerOrderData,
			takerOrderData,
			typeNft
		)
	}

	async makeSellOrder(contract: Address, tokenId: string) {
		const provider = getRequiredWallet(this.ethereum)
		const signerAddress = toAddress(await provider.getFrom())
		const chainId = await provider.getChainId()
		const addresses = addressesByNetwork[chainId as SupportedChainId]
		const nonce = await provider.getTransactionCount("pending")

		const now = Math.floor(Date.now() / 1000)

		const protocolFees = toBn(0)
		const creatorFees = toBn(0)
		const netPriceRatio = toBn(10000).minus(protocolFees.plus(creatorFees)).toNumber()
		const minNetPriceRatio = 7500

		const makerOrder: MakerOrder = {
			isOrderAsk: true,
			signer: signerAddress,
			collection: contract,
			price: "100000000", // :warning: PRICE IS ALWAYS IN WEI :warning:
			tokenId: tokenId, // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
			amount: "1",
			strategy: addresses.STRATEGY_STANDARD_SALE,
			currency: addresses.WETH,
			// currency: ZERO_ADDRESS,
			nonce: nonce,
			startTime: now,
			endTime: now + 86400, // 1 day validity
			// minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio),
			minPercentageToAsk: minNetPriceRatio,
			params: [],
		}

		await waitTx(
			approveErc721(provider, this.send, contract, signerAddress, toAddress(addresses.TRANSFER_MANAGER_ERC721))
		)
		return {
			...makerOrder,
			signature: await this.getOrderSignature(makerOrder),
		}
	}

	async getOrderSignature(order: MakerOrder): Promise<string> {
		const provider = getRequiredWallet(this.ethereum)

		if (!this.config.exchange.looksrare) {
			throw new Error("Looksrare order cannot be signed without exchange address in config")
		}
		const ethereum = getRequiredWallet(this.ethereum)

		const domain = {
			name: "LooksRareExchange",
			version: "1",
			chainId: await ethereum.getChainId(),
			verifyingContract: this.config.exchange.looksrare,
		}

		const type = {
			MakerOrder: [
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
			],
		}

		const signature = await provider.signTypedData({
			primaryType: "MakerOrder",
			domain,
			types: {
				...EIP712_ORDER_TYPES,
				...type,
			},
			message: {
				isOrderAsk: order.isOrderAsk,
				signer: order.signer,
				collection: order.collection,
				price: order.price,
				tokenId: order.tokenId,
				amount: order.amount,
				strategy: order.strategy,
				currency: order.currency,
				nonce: order.nonce,
				startTime: order.startTime,
				endTime: order.endTime,
				minPercentageToAsk: order.minPercentageToAsk,
				params: order.params,
			},
		})
		return signature
	}

}

export function encodeLooksRareData(
	ethereum: Ethereum,
	makerOrder: MakerOrder & { v: number, r: string, s: string },
	takerOrder: TakerOrder,
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
