import type { Ethereum, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { Action } from "@rarible/action"
import type { Address, AssetType } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import { toBn } from "@rarible/utils"
import type { SimpleOpenSeaV1Order, SimpleOrder, SimpleRaribleV2Order } from "../types"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import type { RaribleEthereumApis } from "../../common/apis"
import type { CheckAssetTypeFunction } from "../check-asset-type"
import { checkAssetType } from "../check-asset-type"
import { checkLazyAssetType } from "../check-lazy-asset-type"
import { checkChainId } from "../check-chain-id"
import type { IRaribleEthereumSdkConfig } from "../../types"
import { createExchangeWrapperContract } from "../contracts/exchange-wrapper"
import { prepareForExchangeWrapperFees } from "../../common/prepare-fee-for-exchange-wrapper"
import type {
	FillBatchOrderAction,
	FillBatchOrderRequest,
	FillBatchSingleOrderRequest,
	FillOrderStageId,
	OpenSeaV1OrderFillRequest,
	OrderFillSendData,
	PreparedOrderRequestDataForExchangeWrapper,
	RaribleV2OrderFillRequest,
} from "./types"
import type { OrderFillTransactionData } from "./types"
import { RaribleV2OrderHandler } from "./rarible-v2"
import { OpenSeaOrderHandler } from "./open-sea"

export class BatchOrderFiller {
	v2Handler: RaribleV2OrderHandler
	openSeaHandler: OpenSeaOrderHandler
	private checkAssetType: CheckAssetTypeFunction
	private checkLazyAssetType: (type: AssetType) => Promise<AssetType>

	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly apis: RaribleEthereumApis,
		private readonly getBaseOrderFee: (type: SimpleOrder["type"]) => Promise<number>,
		private readonly sdkConfig?: IRaribleEthereumSdkConfig
	) {
		this.v2Handler = new RaribleV2OrderHandler(ethereum, send, config, getBaseOrderFee)
		this.openSeaHandler = new OpenSeaOrderHandler(ethereum, send, config, apis, getBaseOrderFee, sdkConfig)
		this.checkAssetType = checkAssetType.bind(this, apis.nftCollection)
		this.checkLazyAssetType = checkLazyAssetType.bind(this, apis.nftItem)
		this.getTransactionData = this.getTransactionData.bind(this)
		this.getTransactionRequestData = this.getTransactionRequestData.bind(this)
	}

	private getFillAction<Request extends FillBatchOrderRequest>()
	: Action<FillOrderStageId, Request, EthereumTransaction> {
		return Action
			.create({
				id: "approve" as const,
				run: async (request: Request) => {
					if (!this.ethereum) {
						throw new Error("Wallet undefined")
					}
					if (!request.length) {
						throw new Error("Request is empty")
					}
					const from = toAddress(await this.ethereum.getFrom())

					const preparedOrders = await Promise.all(request.map( async requestSingle => {
						if (requestSingle.order.take.assetType.assetClass !== "ETH") {
							throw new Error("Batch purchase only available for ETH currency")
						}
						if (requestSingle.order.type !== "OPEN_SEA_V1" && requestSingle.order.type !== "RARIBLE_V2") {
							throw new Error("Unsupported order type for batch purchase")
						}
						const inverted = await this.invertOrder(requestSingle, from)
						if (requestSingle.assetType && inverted.make.assetType.assetClass === "COLLECTION") {
							inverted.make.assetType = await this.checkAssetType(requestSingle.assetType)
							inverted.make.assetType = await this.checkLazyAssetType(inverted.make.assetType)
						}
						await this.approveOrder(inverted, Boolean(requestSingle.infinite))
						return {initial: requestSingle, inverted}
					}))
					return {orders: preparedOrders}
				},
			})
			.thenStep({
				id: "send-tx" as const,
				run: async ({orders}: {
					orders: { initial: FillBatchSingleOrderRequest, inverted: SimpleOrder }[],
				}) => {
					return this.sendTransaction(orders)
				},
			})
			.before(async (input: Request) => {
				await checkChainId(this.ethereum, this.config)
				return input
			})
	}

	/**
	 * Buy batch of orders
	 */
	buy: FillBatchOrderAction = this.getFillAction()

	private async invertOrder(request: FillBatchSingleOrderRequest, from: Address) {
		switch (request.order.type) {
			case "RARIBLE_V2":
				return this.v2Handler.invert(<RaribleV2OrderFillRequest>request, from)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.invert(<OpenSeaV1OrderFillRequest>request, from)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(request)}`)
		}
	}

	private async approveOrder(inverted: SimpleOrder, isInfinite: boolean) {
		switch (inverted.type) {
			case "RARIBLE_V2":
				return this.v2Handler.approve(inverted, isInfinite)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.approve(inverted, isInfinite)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	private async sendTransaction(
		orders: { initial: FillBatchSingleOrderRequest, inverted: SimpleOrder }[]
	) {
		const { functionCall, options } = await this.getTransactionRequestData(orders)
		return this.send(functionCall, options)
	}

	async getTransactionData(request: FillBatchSingleOrderRequest[]): Promise<OrderFillTransactionData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const response = await Promise.all(request.map(async initial => {
			return {
				initial,
				inverted: await this.invertOrder(initial, toAddress(await this?.ethereum?.getFrom()!)),
			}
		}))
		const {functionCall, options} = await this.getTransactionRequestData(response)
		return {data: functionCall.data, options}
	}

	async getTransactionRequestData(
		orders: { initial: FillBatchSingleOrderRequest, inverted: SimpleOrder }[]
	): Promise<OrderFillSendData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}

		let optionsArray: EthereumSendOptions[] = []
		let encodedFees: string[] = []
		const ordersCallData: PreparedOrderRequestDataForExchangeWrapper["data"][] =
			await Promise.all(orders.map( async ({initial, inverted}) => {
				const requestData = await this.getTransactionSingleRequestData(initial, inverted)
				if (initial.order.type === "OPEN_SEA_V1") {
					encodedFees = encodedFees.concat(prepareForExchangeWrapperFees(initial.originFees || []))
				}
				optionsArray.push(requestData.options)
				return { ...requestData.data }
			}))

		const wrapperContract = createExchangeWrapperContract(this.ethereum, this.config.exchange.wrapper)
		const functionCall = wrapperContract.functionCall("bulkPurchase", ordersCallData, encodedFees)
		return {functionCall, options: this.calculateOptionsFromArray(optionsArray)}
	}

	private calculateOptionsFromArray(options: EthereumSendOptions[]): EthereumSendOptions {
		return  options.reduce((v, c) => (
			{value: toBn(v.value || 0).plus(c.value || 0).toString()}
		), {value: 0})
	}

	private async getTransactionSingleRequestData(
		request: FillBatchSingleOrderRequest, inverted: SimpleOrder
	): Promise<PreparedOrderRequestDataForExchangeWrapper> {
		switch (request.order.type) {
			case "RARIBLE_V2":
				return this.v2Handler.getTransactionDataForExchangeWrapper(
          <SimpleRaribleV2Order>request.order,
          <SimpleRaribleV2Order>inverted,
				)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.getTransactionDataForExchangeWrapper(
          <SimpleOpenSeaV1Order>request.order,
					<SimpleOpenSeaV1Order>inverted,
					request.originFees,
				)
			default:
				throw new Error(`Unsupported request: ${JSON.stringify(request)}`)
		}
	}
}
