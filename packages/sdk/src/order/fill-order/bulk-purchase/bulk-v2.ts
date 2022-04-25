import type { Address } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress, toBinary, ZERO_ADDRESS } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Erc1155AssetType, Erc721AssetType } from "@rarible/ethereum-api-client"
import type { BigNumberValue } from "@rarible/utils/build/bn"
import { hashToSign, orderToStruct } from "../../sign-order"
import type { EthereumConfig } from "../../../config/type"
import type { SendFunction } from "../../../common/send-transaction"
import type { SimpleRaribleV2Order } from "../../types"
import { isSigner } from "../../../common/is-signer"
import type { SimpleOrder } from "../../types"
import type { RaribleEthereumApis } from "../../../common/apis"
import { createExchangeBulkV2Contract } from "../../contracts/exchange-bulk-v2"
import { createOpenseaContract } from "../../contracts/exchange-opensea-v1"
import { toVrs } from "../../../common/to-vrs"
import type { OrderFillSendData } from "../types"
import type { BulkFillRequest } from "../types"
import type {
	EncodedOrderCallData} from "../open-sea"
import { getAtomicMatchArgCommonData, getAtomicMatchArgUints,
	getBuySellOrders, getMatchOpenseaOptions,
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
import type { SimpleOpenSeaV1Order } from "../../types"
import { getRequiredWallet } from "../../../common/get-required-wallet"
import { createMerkleValidatorContract } from "../../contracts/merkle-validator"
import { isNft } from "../../is-nft"
import type { RaribleV2OrderFillRequest } from "../types"
import { OrderFiller } from "../index"
import {
	getAtomicMatchArgAddressesForBulkV2,
} from "./open-sea"

export class BulkV2OHandler {
	v2Handler: RaribleV2OrderHandler
	openSeaHandler: OpenSeaOrderHandler
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly apis: RaribleEthereumApis,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
	) {
		this.v2Handler = new RaribleV2OrderHandler(ethereum, send, config, getBaseOrderFeeConfig)
		this.openSeaHandler = new OpenSeaOrderHandler(ethereum, send, config, apis, getBaseOrderFeeConfig)
		this.v2Handler = new RaribleV2OrderHandler(ethereum, send, config, getBaseOrderFeeConfig)
	}


	async getTransactionData(
		request: BulkFillRequest[]
	): Promise<OrderFillSendData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		let options = {}
		const tradeData: {
			marketWyvern: boolean, amount: string, tradeData: string
		}[] = await Promise.all(request.map(async o => {
			const {order} = o
			if (!this.ethereum) {
				throw new Error("Wallet undefined")
			}
			if (order.take.assetType.assetClass !== "ETH") {
				throw new Error("Bulk purchase only available for ETH currency")
			}
			const from = toAddress(await this.ethereum.getFrom())
			switch (order.type) {
				case "RARIBLE_V2": {
					const inverted = this.v2Handler.invert(<RaribleV2OrderFillRequest>o, from)
					const {functionCall, options} = await this.v2Handler.getTransactionData(order, inverted)
					return {
						marketWyvern: false,
						amount: options.value?.toString()!,
						tradeData: functionCall.data,
					}
				}
				case "OPEN_SEA_V1": {
					const inverted = await this.openSeaHandler.invert({ order }, from)
					const { buy, sell } = getBuySellOrders(order, inverted)
					const sellOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, sell)
					const buyOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, buy)

					const exchangeContract = createOpenseaContract(this.ethereum, order.data.exchange)

					const buyVRS = toVrs(buy.signature || "")
					const sellVRS = toVrs(sell.signature || "")

					console.log("TOKEN ID: ", isNft(order.make.assetType) ? order.make.assetType.tokenId : "Not an nft")
					const encodedInitial = await this.encodeOrder(order)
					sellOrderToSignDTO.calldata = encodedInitial.callData
					sellOrderToSignDTO.replacementPattern = encodedInitial.replacementPattern
					sellOrderToSignDTO.target = encodedInitial.target
					const encodedInverted = await this.encodeOrder(inverted)
					buyOrderToSignDTO.calldata = encodedInverted.callData
					buyOrderToSignDTO.replacementPattern = encodedInverted.replacementPattern
					buyOrderToSignDTO.target = encodedInverted.target

					//---------temp
					const zeroWord = "0000000000000000000000000000000000000000000000000000000000000000"
					const hexTokenId = isNft(order.make.assetType) ? order.make.assetType.tokenId : ""
					const token = isNft(order.make.assetType) ? order.make.assetType.contract : ""
					const addrToBytes32No0x = (addr: Address) => ("000000000000000000000000" + addr.substring(2))
					const merklePart = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000"
					const methodSigPart = "0xfb16a595"
					buyOrderToSignDTO.calldata = toBinary(
						methodSigPart +
						zeroWord + addrToBytes32No0x(from) +
						addrToBytes32No0x(toAddress(token)) + fillStartZeroesTo64(hexTokenId) + merklePart)
					sellOrderToSignDTO.calldata = toBinary(
						methodSigPart +
						addrToBytes32No0x(order.maker) + zeroWord +
						addrToBytes32No0x(toAddress(token)) + fillStartZeroesTo64(hexTokenId) + merklePart)
					//---------temp
					console.log("buyOrderToSignDTO", buyOrderToSignDTO)
					console.log("sellOrderToSignDTO", sellOrderToSignDTO)
					const ordersCanMatchFunctionCall = await exchangeContract
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
							sellOrderToSignDTO.staticExtradata
						)
					console.log("functionCall: ordersCanMatch_", await ordersCanMatchFunctionCall.getCallInfo())
					const ordersCanMatch = await ordersCanMatchFunctionCall.call()
					if (!ordersCanMatch) {
						throw new Error("Orders cannot be matched")
					}
					console.log("Orders can match!!!!!!!!!!!!!!!")

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
						// [buyVRS.v, sellVRS.v],
						[27, 27],
						[
							"0x0000000000000000000000000000000000000000000000000000000000000000",
							"0x0000000000000000000000000000000000000000000000000000000000000000",
							"0x0000000000000000000000000000000000000000000000000000000000000000",
							"0x0000000000000000000000000000000000000000000000000000000000000000",
							"0x0000000000000000000000000000000000000000000000000000000000000000",
						],
						// [buyVRS.r, buyVRS.s, sellVRS.r, sellVRS.s, this.config.openSea.metadata],
					)

					console.log("functionCall.getCallInfo", await functionCall.getCallInfo())
					// options = {...await getMatchOpenseaOptions(buy)}
					// return {
					// 	marketWyvern: true,
					// 	amount: order.take.value,
					// 	tradeData: functionCall.data,
					// }
					const {
						functionCall: functionCallTest, options,
					} = await this.openSeaHandler.getTransactionData(order, inverted)
					// const word64 = "0000000000000000000000000000000000000000000000000000000000000000"
					// const data = functionCall.data.split(hexTokenId).join(word64+hexTokenId)
					const result = await functionCall.call()
					console.log("result pre", result)
					return {
						marketWyvern: true,
						amount: order.take.value, //options.value?.toString()!,
						tradeData: functionCallTest.data,
					}
				}
				default: throw new Error("Unsupported order type")
			}
		}))
		console.log("tradeData", tradeData)
		const exchangeBulkV2Contract = createExchangeBulkV2Contract(this.ethereum, this.config.exchange.bulkV2)
		const functionCall = exchangeBulkV2Contract.functionCall(
			"bulkTransfer",
			tradeData,
		)

		return {
			functionCall,
			options,
		}
	}

	async sendTransaction(
		initial: BulkFillRequest[]
	): Promise<EthereumTransaction> {
		const {functionCall, options} = await this.getTransactionData(initial)
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
		assetType: Erc721AssetType, maker: Address, validatorAddress: Address, isSellSide: boolean
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
		validatorAddress: Address, isSellSide: boolean
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
