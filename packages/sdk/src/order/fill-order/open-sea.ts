import type { Address, Asset, Binary, Erc721AssetType } from "@rarible/ethereum-api-client"
import { OrderOpenSeaV1DataV1Side } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumContract, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress, toBigNumber, toBinary, ZERO_ADDRESS } from "@rarible/types"
import { backOff } from "exponential-backoff"
import { BigNumber, toBn } from "@rarible/utils"
import type { OrderOpenSeaV1DataV1 } from "@rarible/ethereum-api-client/build/models/OrderData"
import type { Maybe } from "@rarible/types/build/maybe"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { createOpenseaProxyRegistryEthContract } from "../contracts/proxy-registry-opensea"
import { approveErc20 } from "../approve-erc20"
import { approveErc721 } from "../approve-erc721"
import { approveErc1155 } from "../approve-erc1155"
import { getAssetWithFee } from "../get-asset-with-fee"
import { createOpenseaContract } from "../contracts/exchange-opensea-v1"
import { toVrs } from "../../common/to-vrs"
import { waitTx } from "../../common/wait-tx"
import type { SimpleOpenSeaV1Order, SimpleOrder } from "../types"
import { createErc721Contract } from "../contracts/erc721"
import { getRequiredWallet } from "../../common/get-required-wallet"
import { getErc721Contract } from "../../nft/contracts/erc721"
import { ERC721VersionEnum } from "../../nft/contracts/domain"
import { createMerkleValidatorContract } from "../contracts/merkle-validator"
import { getErc1155Contract } from "../../nft/contracts/erc1155"
import { createErc1155Contract } from "../contracts/erc1155"
import type { RaribleEthereumApis } from "../../common/apis"
import { isErc721v3Collection } from "../../nft/mint"
import type { OpenSeaOrderDTO } from "./open-sea-types"
import type { OpenSeaV1OrderFillRequest, OrderFillSendData, OrderHandler } from "./types"
import {
	convertOpenSeaOrderToDTO,
	ERC1155_MAKE_REPLACEMENT,
	ERC1155_TAKE_REPLACEMENT,
	ERC1155_VALIDATOR_MAKE_REPLACEMENT,
	ERC1155_VALIDATOR_TAKE_REPLACEMENT,
	ERC721_MAKE_REPLACEMENT,
	ERC721_TAKE_REPLACEMENT,
	ERC721_VALIDATOR_MAKE_REPLACEMENT,
	ERC721_VALIDATOR_TAKE_REPLACEMENT,
} from "./open-sea-converter"

export type EncodedOrderCallData = { callData: Binary, replacementPattern: Binary, target: Address }

export class OpenSeaOrderHandler implements OrderHandler<OpenSeaV1OrderFillRequest> {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly apis: RaribleEthereumApis,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
	) {}

	invert({ order }: OpenSeaV1OrderFillRequest, maker: Address): SimpleOpenSeaV1Order {
		if (order.data.side === "BUY" && order.make.assetType.assetClass === "ETH") {
			throw new Error("BUY order with make=ETH can be only")
		}
		if (order.data.feeRecipient === ZERO_ADDRESS) {
			throw new Error("feeRecipient should be specified")
		}

		// export enum WyvernSchemaName {
		//   ERC721 = "ERC721",
		//   ERC721v3 = "ERC721v3",
		//   ERC1155 = "ERC1155",
		// }
		// const transfer =
		//   validatorAddress && schema.functions.checkAndTransfer
		//     ? schema.functions.checkAndTransfer(asset, validatorAddress)
		//     : schema.functions.transfer(asset);
		// const schema = this._getSchema(order.metadata.schema)

		// const matchingOrder = this.encodeBuy(schema, order.make)

		const data: OrderOpenSeaV1DataV1 = {
			...order.data,
			feeRecipient: ZERO_ADDRESS,
			side: order.data.side === OrderOpenSeaV1DataV1Side.BUY
				? OrderOpenSeaV1DataV1Side.SELL
				: OrderOpenSeaV1DataV1Side.BUY,
		}
		const invertedOrder: SimpleOpenSeaV1Order = {
			...order,
			make: {
				...order.take,
			},
			take: {
				...order.make,
			},
			maker,
			taker: order.maker,
			signature: undefined,
			data,
		}
		invertedOrder.data = {
			...invertedOrder.data,
			...this.encodeOrder(invertedOrder),
		}

		return invertedOrder
	}

	async encodeOrder(order: SimpleOpenSeaV1Order): Promise<EncodedOrderCallData> {
		const ethereum = getRequiredWallet(this.ethereum)
		const makeAssetType = order.make.assetType
		const takeAssetType = order.take.assetType

		let callData: Binary
		let replacementPattern: Binary
		let target: Address
		const shouldValidate = order.data.target && order.data.target === this.config.openSea.merkleValidator
		const validatorAddress = shouldValidate ? order.data.target : undefined
		// if (shouldValidate)
		//todo calculate calldata and replacement pattern
		if (makeAssetType.assetClass === "ERC721") {
			//if v3 version
			// this.getErc721EncodedData(makeAssetType, order.maker, true, validatorAddress)
			const collection = await this.apis.nftCollection.getNftCollectionById({
				collection: toAddress(makeAssetType.contract),
			})
			const isErc721v3 = isErc721v3Collection(collection)
			if (validatorAddress) {
				const c = createMerkleValidatorContract(ethereum, validatorAddress)
				replacementPattern = ERC721_VALIDATOR_MAKE_REPLACEMENT
				const callMethod = isErc721v3 ? "matchERC721WithSafeTransferUsingCriteria" : "matchERC721UsingCriteria"
				const methodArgs = [order.maker, ZERO_ADDRESS, makeAssetType.contract, makeAssetType.tokenId, "", []]
				callData = toBinary(c.functionCall(callMethod, ...methodArgs).data)
				target = validatorAddress
			} else {

				replacementPattern = ERC721_MAKE_REPLACEMENT
				target = makeAssetType.contract
				if (isErc721v3) {
					const c = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, makeAssetType.contract)
					callData = toBinary(c.functionCall("safeTransferFrom", order.maker, ZERO_ADDRESS, makeAssetType.tokenId).data)
				} else {
					const c = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, makeAssetType.contract)
					callData = toBinary(c.functionCall("transferFrom", order.maker, ZERO_ADDRESS, makeAssetType.tokenId).data)
				}

			}

		} else if (makeAssetType.assetClass === "ERC1155") {
			// getErc1155Contract(ethereum, makeAssetType.contract)

			if (validatorAddress) {
				const c = createMerkleValidatorContract(ethereum, validatorAddress)
				callData = toBinary(c.functionCall("matchERC1155UsingCriteria", order.maker, ZERO_ADDRESS, makeAssetType.contract, makeAssetType.tokenId, order.make.value, "0x", []).data)
				replacementPattern = ERC1155_VALIDATOR_MAKE_REPLACEMENT
				target = validatorAddress
			} else {
				const c = createErc1155Contract(ethereum, makeAssetType.contract)
				callData = toBinary(c.functionCall("safeTransferFrom", order.maker, ZERO_ADDRESS, makeAssetType.tokenId, order.make.value, "0x").data)
				replacementPattern = ERC1155_MAKE_REPLACEMENT
				target = makeAssetType.contract
			}

		} else if (takeAssetType.assetClass === "ERC721") {

			const collection = await this.apis.nftCollection.getNftCollectionById({
				collection: toAddress(takeAssetType.contract),
			})
			const isErc721v3 = isErc721v3Collection(collection)
			if (validatorAddress) {
				const c = createMerkleValidatorContract(ethereum, validatorAddress)
				replacementPattern = ERC721_VALIDATOR_TAKE_REPLACEMENT
				let callmethod = isErc721v3 ? "matchERC721WithSafeTransferUsingCriteria" : "matchERC721UsingCriteria"
				const methodArgs = [ZERO_ADDRESS, order.maker, takeAssetType.contract, takeAssetType.tokenId, "", []]
				callData = toBinary(c.functionCall(callmethod, ...methodArgs).data)
				target = validatorAddress
			} else {

				replacementPattern = ERC721_TAKE_REPLACEMENT
				target = takeAssetType.contract
				if (isErc721v3) {
					const c = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, takeAssetType.contract)
					callData = toBinary(c.functionCall("safeTransferFrom", ZERO_ADDRESS, order.maker, takeAssetType.tokenId).data)
				} else {
					const c = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, takeAssetType.contract)
					callData = toBinary(c.functionCall("transferFrom", ZERO_ADDRESS, order.maker, takeAssetType.tokenId).data)
				}
			}

		} else if (takeAssetType.assetClass === "ERC1155") {

			if (validatorAddress) {
				const c = createMerkleValidatorContract(ethereum, validatorAddress)
				callData = toBinary(c.functionCall("matchERC1155UsingCriteria", ZERO_ADDRESS, order.maker, takeAssetType.contract, takeAssetType.tokenId, order.take.value, "0x", []).data)
				replacementPattern = ERC1155_VALIDATOR_TAKE_REPLACEMENT
				target = validatorAddress
			} else {
				const c = createErc1155Contract(ethereum, takeAssetType.contract)
				callData = toBinary(c.functionCall("safeTransferFrom", ZERO_ADDRESS, order.maker, takeAssetType.tokenId, order.take.value, "0x").data)
				replacementPattern = ERC1155_TAKE_REPLACEMENT
				target = takeAssetType.contract
			}

		} else {
			throw new Error("should never happen")
		}

		return {
			target,
			callData,
			replacementPattern,
		}
	}

	async getErc721EncodedData(
		assetType: Erc721AssetType, maker: Address, isSellSide: boolean, validatorAddress: Address | undefined
	): Promise<EncodedOrderCallData> {
		const ethereum = getRequiredWallet(this.ethereum)
		const collection = await this.apis.nftCollection.getNftCollectionById({
			collection: toAddress(assetType.contract),
		})
		const isErc721v3 = isErc721v3Collection(collection)
		if (validatorAddress) {
			const c = createMerkleValidatorContract(ethereum, validatorAddress)
			replacementPattern = ERC721_VALIDATOR_MAKE_REPLACEMENT
			const callMethod = isErc721v3 ? "matchERC721WithSafeTransferUsingCriteria" : "matchERC721UsingCriteria"
			const methodArgs = [maker, ZERO_ADDRESS, assetType.contract, assetType.tokenId, "", []]
			callData = toBinary(c.functionCall(callMethod, ...methodArgs).data)
			target = validatorAddress
		} else {

			replacementPattern = ERC721_MAKE_REPLACEMENT
			target = assetType.contract
			if (isErc721v3) {
				const c = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, assetType.contract)
				callData = toBinary(c.functionCall("safeTransferFrom", maker, ZERO_ADDRESS, assetType.tokenId).data)
			} else {
				const c = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, assetType.contract)
				callData = toBinary(c.functionCall("transferFrom", maker, ZERO_ADDRESS, assetType.tokenId).data)
			}

		}
	}

	async getBaseOrderFee(): Promise<number> {
		return this.getBaseOrderFeeConfig("OPEN_SEA_V1")
	}

	getOrderFee(order: SimpleOpenSeaV1Order): number {
		if (order.data.feeRecipient === ZERO_ADDRESS) {
			return toBn(order.data.takerProtocolFee).plus(order.data.takerRelayerFee).toNumber()
		} else {
			return toBn(order.data.makerProtocolFee).plus(order.data.makerRelayerFee).toNumber()
		}
	}

	async approve(order: SimpleOpenSeaV1Order, infinite: boolean) {
		const fee = this.getOrderFee(order)
		if (order.data.side === "BUY") {
			const assetWithFee = getAssetWithFee(order.make, fee)
			await waitTx(this.approveSingle(order.maker, assetWithFee, infinite))
		} else {
			await waitTx(this.approveSingle(order.maker, order.make, infinite))
			const value = toBn(order.take.value)
				.multipliedBy(fee)
				.dividedBy(10000)
				.integerValue(BigNumber.ROUND_FLOOR)
				.toFixed()
			const feeOnly: Asset = {
				...order.take,
				value: toBigNumber(value),
			}
			await waitTx(this.approveSingle(order.maker, feeOnly, infinite))
		}
	}

	async getTransactionData(
		initial: SimpleOpenSeaV1Order, inverted: SimpleOpenSeaV1Order
	): Promise<OrderFillSendData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const { buy, sell } = getBuySellOrders(initial, inverted)
		const sellOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, sell)
		const buyOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, buy)

		const exchangeContract = createOpenseaContract(this.ethereum, this.config.exchange.openseaV1)

		const buyVRS = toVrs(buy.signature || "")
		const sellVRS = toVrs(sell.signature || "")

		const functionCall = exchangeContract.functionCall(
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
			[buyVRS.v, sellVRS.v],
			[buyVRS.r, buyVRS.s, sellVRS.r, sellVRS.s, this.config.openSea.metadata],
		)

		return {
			functionCall,
			options: await getMatchOpenseaOptions(buy),
		}
	}

	async sendTransaction(initial: SimpleOpenSeaV1Order, inverted: SimpleOpenSeaV1Order): Promise<EthereumTransaction> {
		const {functionCall, options} = await this.getTransactionData(initial, inverted)
		return this.send(functionCall, options)
	}

	async approveSingle(
		maker: Address,
		asset: Asset,
		infinite: undefined | boolean = true,
	): Promise<EthereumTransaction | undefined> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		switch (asset.assetType.assetClass) {
			case "ERC20": {
				const contract = asset.assetType.contract
				const operator = this.config.transferProxies.openseaV1
				return approveErc20(this.ethereum, this.send, contract, maker, operator, asset.value, infinite)
			}
			case "ERC721": {
				const contract = asset.assetType.contract
				const proxyAddress = await this.getRegisteredProxy(maker)
				return approveErc721(this.ethereum, this.send, contract, maker, proxyAddress)
			}
			case "ERC1155": {
				const contract = asset.assetType.contract
				const proxyAddress = await this.getRegisteredProxy(maker)
				return approveErc1155(this.ethereum, this.send, contract, maker, proxyAddress)
			}
			default:
				return undefined
		}
	}

	private async getRegisteredProxy(maker: Address): Promise<Address> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const proxyRegistry = this.config.openSea.proxyRegistry
		const proxyRegistryContract = createOpenseaProxyRegistryEthContract(this.ethereum, proxyRegistry)
		const proxyAddress = await getSenderProxy(proxyRegistryContract, maker)

		if (proxyAddress === ZERO_ADDRESS) {
			const registerTx = await proxyRegistryContract.functionCall("registerProxy").send()
			await registerTx.wait()

			return backOff(async () => {
				const value = await getSenderProxy(proxyRegistryContract, maker)
				if (value === ZERO_ADDRESS) {
					throw new Error("Expected non-zero proxy address")
				}
				return value
			}, {
				maxDelay: 500,
				numOfAttempts: 10,
				delayFirstAttempt: true,
				startingDelay: 100,
			})
		}

		return proxyAddress
	}
}

async function getMatchOpenseaOptions(buy: SimpleOpenSeaV1Order): Promise<EthereumSendOptions> {
	if (buy.make.assetType.assetClass === "ETH") {
		const fee = toBn(buy.data.takerProtocolFee).plus(buy.data.takerRelayerFee).toNumber()
		const assetWithFee = getAssetWithFee(buy.make, fee)
		return { value: assetWithFee.value }
	} else {
		return {}
	}
}

async function getSenderProxy(registryContract: EthereumContract, sender: Address) {
	return toAddress(await registryContract.functionCall("proxies", sender).call())
}

function getBuySellOrders(left: SimpleOpenSeaV1Order, right: SimpleOpenSeaV1Order) {
	if (left.data.side === "SELL") {
		return {
			buy: right,
			sell: left,
		}
	} else {
		return {
			buy: left,
			sell: right,
		}
	}
}

export function getAtomicMatchArgAddresses(dto: OpenSeaOrderDTO) {
	return [dto.exchange, dto.maker, dto.taker, dto.feeRecipient, dto.target, dto.staticTarget, dto.paymentToken]
}

export function getAtomicMatchArgUints(dto: OpenSeaOrderDTO) {
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

export function getAtomicMatchArgCommonData(dto: OpenSeaOrderDTO) {
	return [dto.feeMethod, dto.side, dto.saleKind, dto.howToCall]
}
