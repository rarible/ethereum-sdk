import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { SeaportOrderType } from "@rarible/ethereum-api-client/build/models/SeaportOrderType"
import { SeaportItemType } from "@rarible/ethereum-api-client/build/models/SeaportItemType"
import { ZERO_ADDRESS } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type { AssetType } from "@rarible/ethereum-api-client/build/models/AssetType"
import { isNft } from "../is-nft"
import { addFee } from "../add-fee"
import type { SimpleOrder } from "../types"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import type { EthereumNetwork } from "../../types"
import type { IRaribleEthereumSdkConfig } from "../../types"
import { getRequiredWallet } from "../../common/get-required-wallet"
import { CROSS_CHAIN_SEAPORT_ADDRESS, ItemType, OrderType } from "./seaport-utils/constants"
import type { SeaportV1OrderFillRequest } from "./types"
import type { TipInputItem } from "./seaport-utils/types"
import { fulfillOrderWithWrapper } from "./seaport-utils/seaport-wrapper-utils"
import { fulfillOrder } from "./seaport-utils/seaport-utils"
import type { OrderFillSendData } from "./types"
import { getUpdatedCalldata } from "./common/get-updated-call"
import { hexifyOptionsValue } from "./common/hexify-options-value"

export class SeaportOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
		private readonly env: EthereumNetwork,
		private readonly sdkConfig?: IRaribleEthereumSdkConfig
	) {}

	async sendTransaction(
		request: SeaportV1OrderFillRequest,
	): Promise<EthereumTransaction> {
		const {functionCall, options} = await this.getTransactionData(request)
		return this.send(
			functionCall,
			options
		)
	}

	async getTransactionData(
		request: SeaportV1OrderFillRequest
	): Promise<OrderFillSendData> {
		const ethereum = getRequiredWallet(this.ethereum)
		const { order } = request
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

		if (this.env !== "mainnet") {
			if (order.take.assetType.assetClass === "ETH") {
				const {wrapper} = this.config.exchange
				if (!wrapper || wrapper === ZERO_ADDRESS) {
					throw new Error("Seaport wrapper address has not been set. Change address in config")
				}

				const {functionCall, options} = await fulfillOrderWithWrapper(
					ethereum,
					this.send.bind(this),
					order,
					{
						unitsToFill,
						originFees: request.originFees,
						seaportWrapper: wrapper,
					})
				const updatedOptions = hexifyOptionsValue({
					...options,
					additionalData: getUpdatedCalldata(this.sdkConfig),
				})
				await functionCall.estimateGas({
					from: await ethereum.getFrom(),
					value: options.value,
				})
				return {
					functionCall,
					options: updatedOptions,
				}
			}
		}

		let tips: TipInputItem[] | undefined = []
		if (!takeIsNft) {
			tips = request.originFees?.map(fee => ({
				token: getSeaportToken(order.take.assetType),
				amount: toBn(addFee(order.take, fee.value).value).minus(order.take.value).toString(),
				recipient: fee.account,
			}))
		}
		const {functionCall, options} = await fulfillOrder(
			ethereum,
			this.send.bind(this),
			order,
			{
				unitsToFill,
				tips,
			})
		const updatedOptions = hexifyOptionsValue({
			...options,
			additionalData: getUpdatedCalldata(this.sdkConfig),
		})
		await functionCall.estimateGas({
			from: await ethereum.getFrom(),
			value: options.value,
		})

		return {
			functionCall,
			options: updatedOptions,
		}
	}

	getBaseOrderFee() {
		return this.getBaseOrderFeeConfig("SEAPORT_V1")
	}

	getOrderFee(): number {
		return 0
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
