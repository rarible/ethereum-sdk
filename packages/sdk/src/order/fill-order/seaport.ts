import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
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
import type { EthereumConfig } from "../../config/type"
import { prepareForExchangeWrapperFees } from "../../common/prepare-fee-for-exchange-wrapper"
import { CROSS_CHAIN_SEAPORT_ADDRESS, ItemType, OrderType } from "./seaport-utils/constants"
import type { SeaportV1OrderFillRequest } from "./types"
import type { TipInputItem } from "./seaport-utils/types"
import { fulfillOrderWithWrapper } from "./seaport-utils/seaport-wrapper-utils"
import { fulfillOrder } from "./seaport-utils/seaport-utils"

export class SeaportOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
	) {}

	async fillSeaportOrder(
		order: SimpleSeaportV1Order, request: SeaportV1OrderFillRequest
	): Promise<EthereumTransaction> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}

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

		if (order.take.assetType.assetClass === "ETH") {
			const {seaportWrapper} = this.config.openSea
			if (!seaportWrapper || seaportWrapper === ZERO_ADDRESS) {
				throw new Error("Seaport wrapper address has not been set. Change address in config")
			}

			return fulfillOrderWithWrapper(
				this.ethereum,
				this.send.bind(this),
				order,
				{
					unitsToFill,
					tips: [],
					originFees: request.originFees,
					seaportWrapper,
				})
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

export function getSeaportToken(assetType: AssetType): string {
	switch (assetType.assetClass) {
		case "ETH": return ZERO_ADDRESS
		case "ERC20": return assetType.contract
		default: throw new Error("Asset type should be currency token")
	}
}
