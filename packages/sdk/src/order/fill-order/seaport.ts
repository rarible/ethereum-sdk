import { providers } from "ethers"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { Web3Ethereum } from "@rarible/web3-ethereum"
import type { EthersWeb3ProviderEthereum } from "@rarible/ethers-ethereum"
import { EthersTransaction } from "@rarible/ethers-ethereum"
import { SeaportOrderType } from "@rarible/ethereum-api-client/build/models/SeaportOrderType"
import { SeaportItemType } from "@rarible/ethereum-api-client/build/models/SeaportItemType"
import type { EthereumTransaction } from "@rarible/ethereum-provider/src"
import { ZERO_ADDRESS } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type { AssetType } from "@rarible/ethereum-api-client/build/models/AssetType"
import { BigNumber } from "@rarible/utils"
import type { SimpleSeaportV1Order } from "../types"
import { isNft } from "../is-nft"
import { addFee } from "../add-fee"
import type { SimpleOrder } from "../types"
import type { SendFunction } from "../../common/send-transaction"
import { CROSS_CHAIN_SEAPORT_ADDRESS, ItemType, OrderType } from "./seaport-utils/constants"
import type { SeaportV1OrderFillRequest } from "./types"
import type { OrderWithCounter, TipInputItem } from "./seaport-utils/types"
import { fulfillOrder } from "./seaport-updated/seaport-utils"
import { fulfillOrder as fulfillOrderLegacy } from "./seaport-utils/seaport-utils"
// import { convertAPIOrderToSeaport } from "./seaport-updated/convert-to-seaport-order"

export class SeaportOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
	) {}

	async fillSeaportOrder(
		order: SimpleSeaportV1Order, request: SeaportV1OrderFillRequest
	): Promise<EthereumTransaction> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}

		const ethersProvider = getSeaportProvider(this.ethereum)

		if (order.data.protocol !== CROSS_CHAIN_SEAPORT_ADDRESS) {
			throw new Error("Unsupported protocol")
		}
		if (!order.signature) {
			throw new Error("Signature should exists")
		}
		if (order.start === undefined || order.end === undefined) {
			throw new Error("Order should includes start/end fields")
		}

		const takeIsNft = isNft(order.take.assetType)
		const makeIsNft = isNft(order.make.assetType)
		const unitsToFill = order.make.assetType.assetClass === "ERC1155" || order.take.assetType.assetClass === "ERC1155" ? request.amount : undefined
		const isSupportedPartialFill = order.data.orderType === "PARTIAL_RESTRICTED" || order.data.orderType === "PARTIAL_OPEN"

		let isPartialFill: boolean
		if (takeIsNft) {
			isPartialFill = unitsToFill ? unitsToFill.toString() !== order.take.value.toString() : false
		} else if (makeIsNft) {
			isPartialFill = unitsToFill ? unitsToFill.toString() !== order.make.value.toString() : false
		} else {
			throw new Error("Make/take asset in order is non-nft asset")
		}

		if (!isSupportedPartialFill && isPartialFill) {
			throw new Error("Order is not supported partial fill")
		}

		if (order.taker) {
			throw new Error("You can't fill private orders")
		}

		let tips: TipInputItem[] | undefined = []
		if (!takeIsNft) {
			tips = request.originFees?.map(fee => ({
				token: getSeaportToken(order.take.assetType),
				amount: toBn(addFee(order.take, fee.value).value).minus(order.take.value).toString(),
				recipient: fee.account,
			}))
		}

		return fulfillOrder(
			this.ethereum,
			this.send,
			order,
			{
				unitsToFill,
				tips,
			})


		// const orderData = convertAPIOrderToSeaport(order)
		// console.log("orderData", JSON.stringify(orderData, null, "  "))
		// const {executeAllActions} = await fulfillOrderLegacy(
		// 	ethersProvider,
		// 	{
		// 		order: orderData,
		// 		unitsToFill,
		// 		accountAddress: await this.ethereum.getFrom(),
		// 		recipientAddress: undefined,
		// 		tips,
		// 	})
		// const tx = await executeAllActions()
		// return new EthersTransaction(tx)
	}

	getBaseOrderFee() {
		return this.getBaseOrderFeeConfig("SEAPORT_V1")
	}

	getOrderFee(order: SimpleSeaportV1Order): number {
		const fees = order.data.consideration.reduce((acc, item) => {
			if (item.recipient !== order.maker) {
				acc = acc.plus(item.endAmount)
			}
			return acc
		}, toBn(0))

		return fees.div(order.take.value)
			.multipliedBy(10000)
			.integerValue(BigNumber.ROUND_FLOOR)
			.toNumber()
	}
}

export function convertAPIOrderToSeaport(order: SimpleSeaportV1Order): OrderWithCounter {
	if (order.data.protocol !== CROSS_CHAIN_SEAPORT_ADDRESS) {
		throw new Error("Unsupported protocol")
	}
	if (!order.signature) {
		throw new Error("Signature should exists")
	}
	if (order.start === undefined || order.end === undefined) {
		throw new Error("Order should includes start/end fields")
	}

	return {
		parameters: {
			counter: order.data.counter,
			offerer: order.maker,
			zone: order.data.zone,
			orderType: convertOrderType(order.data.orderType),
			startTime: order.start.toString(),
			endTime: order.end.toString(),
			zoneHash: order.data.zoneHash,
			salt: order.salt,
			offer: order.data.offer.map(offerItem => ({
				itemType: convertItemType(offerItem.itemType),
				token: offerItem.token,
				identifierOrCriteria: offerItem.identifierOrCriteria,
				startAmount: offerItem.startAmount,
				endAmount: offerItem.endAmount,
			})),
			consideration: order.data.consideration.map(item => ({
				itemType: convertItemType(item.itemType),
				token: item.token,
				identifierOrCriteria: item.identifierOrCriteria,
				startAmount: item.startAmount,
				endAmount: item.endAmount,
				recipient: item.recipient,
			})),
			totalOriginalConsiderationItems: order.data.consideration.length,
			conduitKey: order.data.conduitKey,
		},
		signature: order.signature,
	}
}


export function convertOrderType(type: SeaportOrderType): OrderType {
	switch (type) {
		case SeaportOrderType.FULL_OPEN: return OrderType.FULL_OPEN
		case SeaportOrderType.PARTIAL_OPEN: return OrderType.PARTIAL_OPEN
		case SeaportOrderType.FULL_RESTRICTED: return OrderType.FULL_RESTRICTED
		case SeaportOrderType.PARTIAL_RESTRICTED: return OrderType.PARTIAL_RESTRICTED
		default: throw new Error(`Unrecognized order type=${type}`)
	}
}

export function convertItemType(type: SeaportItemType): ItemType {
	switch (type) {
		case SeaportItemType.NATIVE: return ItemType.NATIVE
		case SeaportItemType.ERC20: return ItemType.ERC20
		case SeaportItemType.ERC721: return ItemType.ERC721
		case SeaportItemType.ERC721_WITH_CRITERIA: return ItemType.ERC721_WITH_CRITERIA
		case SeaportItemType.ERC1155: return ItemType.ERC1155
		case SeaportItemType.ERC1155_WITH_CRITERIA: return ItemType.ERC1155_WITH_CRITERIA
		default: throw new Error(`Unrecognized item type=${type}`)
	}
}

export function getSeaportProvider(ethereum: Ethereum): any {
	if (!ethereum) {
		throw new Error("Wallet undefined")
	}
	if (ethereum.constructor.name === "Web3Ethereum") {
		return new providers.Web3Provider(
			(ethereum as Web3Ethereum).getWeb3Instance().currentProvider as providers.ExternalProvider
		)
	} else if (ethereum.constructor.name === "EthersWeb3ProviderEthereum") {
		return (ethereum as EthersWeb3ProviderEthereum).web3Provider
	} else if (ethereum.constructor.name === "EthersEthereum") {
		//todo fix
		throw new Error("Temporary deprecated provider")
		// const wallet = ethereum as EthersEthereum
		// if (!wallet.signer.provider) {
		// 	throw new Error("Provider is not connected for EthersEthereum instance")
		// }
	} else {
		throw new Error("Unrecognized provider for filling seaport operation")
	}
}

export function getSeaportToken(assetType: AssetType): string {
	switch (assetType.assetClass) {
		case "ETH": return ZERO_ADDRESS
		case "ERC20": return assetType.contract
		default: throw new Error("Asset type should be currency token")
	}
}
