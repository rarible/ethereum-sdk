import { providers } from "ethers"
import { Seaport } from "@opensea/seaport-js"
import { CROSS_CHAIN_SEAPORT_ADDRESS, ItemType, OrderType } from "@opensea/seaport-js/lib/constants"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { Web3Ethereum } from "@rarible/web3-ethereum"
import type { EthersWeb3ProviderEthereum } from "@rarible/ethers-ethereum"
import { EthersTransaction } from "@rarible/ethers-ethereum"
import { SeaportOrderType } from "@rarible/ethereum-api-client/build/models/SeaportOrderType"
import { SeaportItemType } from "@rarible/ethereum-api-client/build/models/SeaportItemType"
import type { EthereumTransaction } from "@rarible/ethereum-provider/src"
import { ZERO_ADDRESS } from "@rarible/types"
import type { OrderWithCounter } from "@opensea/seaport-js/lib/types"
import { toBn } from "@rarible/utils/build/bn"
import type { TipInputItem } from "@opensea/seaport-js/lib/types"
import type { AssetType } from "@rarible/ethereum-api-client/build/models/AssetType"
import type { SimpleSeaportV1Order } from "../types"
import { isNft } from "../is-nft"
import { addFee } from "../add-fee"
import type { SeaportV1OrderFillRequest } from "./types"

const CROSS_CHAIN_DEFAULT_CONDUIT_KEY =
  "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000"
const CROSS_CHAIN_DEFAULT_CONDUIT =
  "0x1e0049783f008a0085193e00003d00cd54003c71"

const CONDUIT_KEYS_TO_CONDUIT = {
	[CROSS_CHAIN_DEFAULT_CONDUIT_KEY]: CROSS_CHAIN_DEFAULT_CONDUIT,
}

export class SeaportOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
	) {}

	async fillSeaportOrder(
		order: SimpleSeaportV1Order, request: SeaportV1OrderFillRequest
	): Promise<EthereumTransaction> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}

		const ethersProvider = getSeaportProvider(this.ethereum)
		const seaport = new Seaport(ethersProvider, {
			conduitKeyToConduit: CONDUIT_KEYS_TO_CONDUIT,
			overrides: {
				defaultConduitKey: CROSS_CHAIN_DEFAULT_CONDUIT_KEY,
			},
		})

		if (order.data.protocol !== CROSS_CHAIN_SEAPORT_ADDRESS) {
			throw new Error("Unsupported protocol")
		}
		if (!order.signature) {
			throw new Error("Signature should exists")
		}
		if (order.start === undefined || order.end === undefined) {
			throw new Error("Order should includes start/end fields")
		}

		const unitsToFill = order.make.assetType.assetClass === "ERC1155" || order.take.assetType.assetClass === "ERC1155" ? request.amount : undefined

		const orderData = convertAPIOrderToSeaport(order)

		if (order.taker) {
			throw new Error("You can't fill private orders")
		}

		let tips: TipInputItem[] | undefined
		if (!isNft(order.take.assetType)) {
			tips = request.originFees?.map(fee => ({
				token: getSeaportToken(order.take.assetType),
				amount: toBn(addFee(order.take, fee.value).value).minus(order.take.value).toString(),
				recipient: fee.account,
			}))
		}

		const {executeAllActions} = await seaport.fulfillOrder({
			order: orderData,
			unitsToFill,
			accountAddress: await this.ethereum.getFrom(),
			recipientAddress: undefined,
			tips,
		})
		const tx = await executeAllActions()

		return new EthersTransaction(tx)
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

export function getSeaportProvider(ethereum: Ethereum): providers.JsonRpcProvider {
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
