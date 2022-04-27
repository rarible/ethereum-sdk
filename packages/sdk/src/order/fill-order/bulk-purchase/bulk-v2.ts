import type { Address, AssetType, Erc1155AssetType, Erc721AssetType } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress, toBinary, ZERO_ADDRESS } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import type { BigNumberValue } from "@rarible/utils/build/bn"
import { Action } from "@rarible/action"
import { hashToSign, orderToStruct } from "../../sign-order"
import type { EthereumConfig } from "../../../config/type"
import type { SendFunction } from "../../../common/send-transaction"
import type { SimpleOpenSeaV1Order, SimpleOrder, SimpleRaribleV2Order } from "../../types"
import { isSigner } from "../../../common/is-signer"
import type { RaribleEthereumApis } from "../../../common/apis"
import { createExchangeBulkV2Contract } from "../../contracts/exchange-bulk-v2"
import { createOpenseaContract } from "../../contracts/exchange-opensea-v1"
import { toVrs } from "../../../common/to-vrs"
import type {
	BulkFillRequest,
	FillOrderBulkAction,
	FillOrderRequest,
	FillOrderStageId,
	OpenSeaV1OrderFillRequest,
	OrderFillSendData,
	RaribleV2OrderFillRequest,
} from "../types"
import type { EncodedOrderCallData } from "../open-sea"
import {
	getAtomicMatchArgCommonData,
	getAtomicMatchArgUints,
	getBuySellOrders,
	getMatchOpenseaOptions,
	OpenSeaOrderHandler,
} from "../open-sea"
import { RaribleV2OrderHandler } from "../rarible-v2"
import {
	convertOpenSeaOrderToDTO,
	ERC1155_VALIDATOR_MAKE_REPLACEMENT,
	ERC1155_VALIDATOR_TAKE_REPLACEMENT,
	ERC721_VALIDATOR_MAKE_REPLACEMENT,
	ERC721_VALIDATOR_TAKE_REPLACEMENT,
} from "../open-sea-converter"
import { getRequiredWallet } from "../../../common/get-required-wallet"
import { createMerkleValidatorContract } from "../../contracts/merkle-validator"
import { isNft } from "../../is-nft"
import { OrderFiller } from "../index"
import { checkChainId } from "../../check-chain-id"
import type { CheckAssetTypeFunction } from "../../check-asset-type"
import { checkAssetType } from "../../check-asset-type"
import { checkLazyAssetType } from "../../check-lazy-asset-type"
import type { IRaribleEthereumSdkConfig } from "../../../types"
import { getAtomicMatchArgAddressesForBulkV2 } from "./open-sea"

type InternalBulkRequest = {
	request: BulkFillRequest
	inverted: SimpleOrder
}

export class BulkV2OHandler {
	v2Handler: RaribleV2OrderHandler
	openSeaHandler: OpenSeaOrderHandler
	orderFiller: OrderFiller
	private checkAssetType: CheckAssetTypeFunction
	private checkLazyAssetType: (type: AssetType) => Promise<AssetType>

	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly apis: RaribleEthereumApis,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
		private readonly sdkConfig?: IRaribleEthereumSdkConfig
	) {
		this.v2Handler = new RaribleV2OrderHandler(ethereum, send, config, getBaseOrderFeeConfig)
		this.openSeaHandler = new OpenSeaOrderHandler(ethereum, send, config, apis, getBaseOrderFeeConfig, sdkConfig)
		this.orderFiller = new OrderFiller(ethereum, send, config, apis, getBaseOrderFeeConfig)
		this.checkAssetType = checkAssetType.bind(this, apis.nftCollection)
		this.checkLazyAssetType = checkLazyAssetType.bind(this, apis.nftItem)
	}

	buyBulk: FillOrderBulkAction = this.getFillAction()

	private getFillAction<Request extends BulkFillRequest[]>(): Action<FillOrderStageId, Request, EthereumTransaction> {
		return Action
			.create({
				id: "approve" as const,
				run: async (request: Request) => {
					if (!this.ethereum) {
						throw new Error("Wallet undefined")
					}
					const from = toAddress(await this.ethereum.getFrom())
					const inverted = await Promise.all(request.map(async singleOrder => {
						const invertedSingle = await this.invertOrder(singleOrder, from)
						if (singleOrder.assetType && invertedSingle.make.assetType.assetClass === "COLLECTION") {
							invertedSingle.make.assetType = await this.checkAssetType(singleOrder.assetType)
							invertedSingle.make.assetType = await this.checkLazyAssetType(invertedSingle.make.assetType)
						}
						await this.approveOrder(invertedSingle, Boolean(singleOrder.infinite))
						return { request: singleOrder, inverted: invertedSingle }
					}))
					return inverted
				},
			})
			.thenStep({
				id: "send-tx" as const,
				run: async (internal: InternalBulkRequest[]) => {
					return this.sendTransaction(internal)
				},
			})
			.before(async (input: Request) => {
				await checkChainId(this.ethereum, this.config)
				return input
			})
	}

	private async invertOrder(request: FillOrderRequest, from: Address) {
		switch (request.order.type) {
			case "RARIBLE_V2":
				return this.v2Handler.invert(<RaribleV2OrderFillRequest>request, from)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.invert(<OpenSeaV1OrderFillRequest>request, from)
			default:
				throw new Error(`Unsupported order for bulk purchase: ${JSON.stringify(request)}`)
		}
	}

	private async approveOrder(inverted: SimpleOrder, isInfinite: boolean) {
		switch (inverted.type) {
			case "RARIBLE_V2":
				return this.v2Handler.approve(inverted, isInfinite)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.approve(inverted, isInfinite)
			default:
				throw new Error(`Unsupported order for bulk purchase: ${JSON.stringify(inverted)}`)
		}
	}

	async getTransactionData(internal: InternalBulkRequest[]): Promise<OrderFillSendData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		let options = {}
		const tradeData: {
			marketWyvern: any, amount: any, tradeData: string
		}[] = await Promise.all(internal.map(async requestSingle => {
			const { request, inverted } = requestSingle
			const { order } = request
			if (!this.ethereum) {
				throw new Error("Wallet undefined")
			}
			if (order.take.assetType.assetClass !== "ETH") {
				throw new Error("Bulk purchase only available for ETH currency")
			}
			if (order.type === "RARIBLE_V2" && inverted.type === "RARIBLE_V2") {
				const { functionCall, options } = await this.v2Handler.getTransactionData(order, inverted)
				return {
					marketWyvern: 0,
					amount: options.value?.toString()!,
					tradeData: functionCall.data,
				}
			} else if (order.type === "OPEN_SEA_V1" && inverted.type === "OPEN_SEA_V1") {
				const { buy, sell } = getBuySellOrders(order, inverted)
				const sellOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, sell)
				const buyOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, buy)

				const exchangeContract = createOpenseaContract(this.ethereum, order.data.exchange)

				const buyVRS = toVrs(buy.signature || "")
				const sellVRS = toVrs(sell.signature || "")

				console.log("TOKEN ID: ", isNft(order.make.assetType) ? order.make.assetType.tokenId : "Not an nft")
				// const encodedInitial = await this.encodeOrder(order)
				// sellOrderToSignDTO.calldata = encodedInitial.callData
				// sellOrderToSignDTO.replacementPattern = encodedInitial.replacementPattern
				// sellOrderToSignDTO.target = encodedInitial.target
				// const encodedInverted = await this.encodeOrder(inverted)
				// buyOrderToSignDTO.calldata = encodedInverted.callData
				// buyOrderToSignDTO.replacementPattern = encodedInverted.replacementPattern
				// buyOrderToSignDTO.target = encodedInverted.target

				const ordersCanMatch = await exchangeContract
					.functionCall(
						"ordersCanMatch_",
						[...getAtomicMatchArgAddressesForBulkV2(sellOrderToSignDTO, this.config.exchange.bulkV2)],
						[...getAtomicMatchArgUints(buyOrderToSignDTO), ...getAtomicMatchArgUints(sellOrderToSignDTO)],
						[...getAtomicMatchArgCommonData(buyOrderToSignDTO), ...getAtomicMatchArgCommonData(sellOrderToSignDTO)],
						buyOrderToSignDTO.calldata,
						sellOrderToSignDTO.calldata,
						buyOrderToSignDTO.replacementPattern,
						sellOrderToSignDTO.replacementPattern,
						buyOrderToSignDTO.staticExtradata,
						sellOrderToSignDTO.staticExtradata,
					)
				console.log("order match input data: ", await ordersCanMatch.getCallInfo())
				if (!(await ordersCanMatch.call())) {
					throw new Error("Orders cannot be matched")
				}

				const functionCall = exchangeContract.functionCall(
					"atomicMatch_",
					[...getAtomicMatchArgAddressesForBulkV2(sellOrderToSignDTO, this.config.exchange.bulkV2)],
					[...getAtomicMatchArgUints(buyOrderToSignDTO), ...getAtomicMatchArgUints(sellOrderToSignDTO)],
					[...getAtomicMatchArgCommonData(buyOrderToSignDTO), ...getAtomicMatchArgCommonData(sellOrderToSignDTO)],
					buyOrderToSignDTO.calldata,
					sellOrderToSignDTO.calldata,
					buyOrderToSignDTO.replacementPattern,
					sellOrderToSignDTO.replacementPattern,
					buyOrderToSignDTO.staticExtradata,
					sellOrderToSignDTO.staticExtradata,
					[buyVRS.v, sellVRS.v],
					[buyVRS.r, buyVRS.s, sellVRS.r, sellVRS.s, this.config.openSea.metadata],
				)

				console.log("functionCall.getCallInfo", await functionCall.getCallInfo())
				console.log("eth sdk buy side: ", buy)
				console.log("eth-sdk amount: ", (await getMatchOpenseaOptions(buy)).value?.toString()!)
				return {
					marketWyvern: "1", //1 - opensea; 0 - rarible
					amount: (await getMatchOpenseaOptions(buy)).value?.toString()!,
					tradeData: functionCall.data,
				}
			} else {
				throw new Error("Unsupported order for bulk purchase")
			}
		}))
		console.log("tradeData", tradeData)
		const exchangeBulkV2Contract = createExchangeBulkV2Contract(this.ethereum, this.config.exchange.bulkV2)
		const data = tradeData[0]
		const functionCall = exchangeBulkV2Contract.functionCall(
			"singlePurchase",
			{
				marketId: data.marketWyvern,
				amount: data.amount,
				data: data.tradeData,
			},
			[]
		)

		return {
			functionCall,
			options,
		}
	}

	async sendTransaction(
		internal: InternalBulkRequest[],
	): Promise<EthereumTransaction> {
		const { functionCall, options } = await this.getTransactionData(internal)
		return this.send(functionCall, options)
	}

	async fixForTx(order: SimpleRaribleV2Order): Promise<any> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const hash = hashToSign(this.config, this.ethereum, order)
		const isMakerSigner = await isSigner(this.ethereum, order.maker, hash, order.signature!)
		return orderToStruct(this.ethereum, order, !isMakerSigner)
	}

	async encodeOrder(order: SimpleOpenSeaV1Order): Promise<EncodedOrderCallData> {
		const makeAssetType = order.make.assetType
		const takeAssetType = order.take.assetType
		const validatorAddress = this.config.openSea.merkleValidator!

		if (makeAssetType.assetClass === "ERC721") {
			return this.getErc721EncodedData(makeAssetType, order.maker, validatorAddress, true)
		} else if (makeAssetType.assetClass === "ERC1155") {
			return this.getErc1155EncodedData(makeAssetType, order.make.value, order.maker, validatorAddress, true)
		} else if (takeAssetType.assetClass === "ERC721") {
			return this.getErc721EncodedData(takeAssetType, order.maker, validatorAddress, false)
		} else if (takeAssetType.assetClass === "ERC1155") {
			return this.getErc1155EncodedData(takeAssetType, order.take.value, order.maker, validatorAddress, false)
		} else {
			throw new Error("should never happen")
		}
	}

	async getErc721EncodedData(
		assetType: Erc721AssetType, maker: Address, validatorAddress: Address, isSellSide: boolean,
	): Promise<EncodedOrderCallData> {
		const ethereum = getRequiredWallet(this.ethereum)
		let startArgs = [maker, ZERO_ADDRESS]
		if (!isSellSide) {
			startArgs = [ZERO_ADDRESS, maker]
		}

		const c = createMerkleValidatorContract(ethereum, validatorAddress)

		const methodArgs = [...startArgs, assetType.contract, assetType.tokenId, "0x", []]
		return {
			replacementPattern: isSellSide ? ERC721_VALIDATOR_MAKE_REPLACEMENT : ERC721_VALIDATOR_TAKE_REPLACEMENT,
			callData: toBinary(c.functionCall("matchERC721UsingCriteria", ...methodArgs).data),
			target: validatorAddress,
		}

	}

	async getErc1155EncodedData(
		assetType: Erc1155AssetType, value: BigNumberValue, maker: Address,
		validatorAddress: Address, isSellSide: boolean,
	): Promise<EncodedOrderCallData> {
		const ethereum = getRequiredWallet(this.ethereum)
		let startArgs = [maker, ZERO_ADDRESS]
		if (!isSellSide) {
			startArgs = [ZERO_ADDRESS, maker]
		}
		const c = createMerkleValidatorContract(ethereum, validatorAddress)
		const methodArgs = [...startArgs, assetType.contract, assetType.tokenId, value, "0x", []]
		return {
			replacementPattern: isSellSide ? ERC1155_VALIDATOR_MAKE_REPLACEMENT : ERC1155_VALIDATOR_TAKE_REPLACEMENT,
			target: validatorAddress,
			callData: toBinary(c.functionCall("matchERC1155UsingCriteria", ...methodArgs).data),
		}
	}

	async getBaseOrderFee(): Promise<number> {
		return this.getBaseOrderFeeConfig("OPEN_SEA_V1")
	}

}

function fillStartZeroesTo64(data: string) {
	return data.padStart(64, "0")
}
