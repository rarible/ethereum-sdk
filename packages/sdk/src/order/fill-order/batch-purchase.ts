import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { Action } from "@rarible/action"
import type { Address, AssetType } from "@rarible/ethereum-api-client"
import type { Part } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import { toAddress, toBigNumber } from "@rarible/types"
import type { SimpleOpenSeaV1Order, SimpleOrder, SimpleRaribleV2Order } from "../types"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import type { RaribleEthereumApis } from "../../common/apis"
import type { CheckAssetTypeFunction } from "../check-asset-type"
import { checkAssetType } from "../check-asset-type"
import { checkLazyAssetType } from "../check-lazy-asset-type"
import { checkChainId } from "../check-chain-id"
import type { IRaribleEthereumSdkConfig } from "../../types"
import type {
	FillBatchOrderAction,
	FillBatchOrderRequest,
	FillBatchSingleOrderRequest,
	FillOrderStageId,
	OpenSeaV1OrderFillRequest,
	OrderFillSendData,
	OrderFillTransactionData,
	PreparedOrderRequestDataForExchangeWrapper,
	RaribleV2OrderFillRequest,
} from "./types"
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

	/**
	 * Buy batch of orders
	 *
	 * Note: Additional origin fees applied only for opensea orders
	 */
	buy: FillBatchOrderAction = this.getFillAction()

	private getFillAction<Request extends FillBatchOrderRequest>()
	: Action<FillOrderStageId, Request, EthereumTransaction> {
		return Action
			.create({
				id: "approve" as const,
				run: async (request: Request) => {
					if (!this.ethereum) {
						throw new Error("Wallet undefined")
					}
					if (!request.requests.length) {
						throw new Error("Request is empty")
					}
					const from = toAddress(await this.ethereum.getFrom())

					const preparedOrders = await Promise.all(request.requests.map( async requestSingle => {
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
					return {orders: preparedOrders, originFees: request.originFees}
				},
			})
			.thenStep({
				id: "send-tx" as const,
				run: async ({orders, originFees}: {
					orders: { initial: FillBatchSingleOrderRequest, inverted: SimpleOrder }[],
					originFees?: Part[]
				}) => {
					return this.sendTransaction(orders, originFees)
				},
			})
			.before(async (input: Request) => {
				await checkChainId(this.ethereum, this.config)
				return input
			})
	}

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
		orders: { initial: FillBatchSingleOrderRequest, inverted: SimpleOrder }[],
		originFees: Part[] | undefined
	) {
		const { functionCall, options } = await this.getTransactionRequestData(orders, originFees)
		return this.send(functionCall, options)
	}

	async getTransactionData(
		request: FillBatchSingleOrderRequest[],
		originFees: Part[] | undefined
	): Promise<OrderFillTransactionData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const response = await Promise.all(request.map(async initial => {
			return {
				initial,
				inverted: await this.invertOrder(initial, toAddress(await this?.ethereum?.getFrom()!)),
			}
		}))
		const {functionCall, options} = await this.getTransactionRequestData(response, originFees)
		return {data: await functionCall.getData(), options}
	}

	private async getTransactionRequestData(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		orders: { initial: FillBatchSingleOrderRequest, inverted: SimpleOrder }[],
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		originFees: Part[] | undefined
	): Promise<OrderFillSendData> {
		throw new Error("This method not supported yet")

		// if (!this.ethereum) {
		// 	throw new Error("Wallet undefined")
		// }
		//
		// const { originFeeConverted, totalFeeBasisPoints } = originFeeValueConvert(originFees)
		// let totalValue = toBn(0)
		// const ordersCallData: PreparedOrderRequestDataForExchangeWrapper["data"][] =
		// 	await Promise.all(orders.map( async ({initial, inverted}) => {
		// 		const requestData = await this.getTransactionSingleRequestData(initial, inverted, totalFeeBasisPoints > 0)
		//
		// 		totalValue = totalValue.plus(requestData.options?.value || 0)
		//
		// 		return { ...requestData.data }
		// 	}))
		//
		// const wrapperContract = createExchangeWrapperContract(this.ethereum, this.config.exchange.wrapper)
		// const functionCall = wrapperContract.functionCall(
		// 	"bulkPurchase",
		// 	ordersCallData,
		// 	originFeeConverted[0],
		// 	originFeeConverted[1]
		// )
		//
		// return {functionCall, options: { value: calcValueWithFees(totalValue, totalFeeBasisPoints).toString() }}
	}

	private async getTransactionSingleRequestData(
		request: FillBatchSingleOrderRequest,
		inverted: SimpleOrder,
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
					toBigNumber("0")
				)
			default:
				throw new Error(`Unsupported request: ${JSON.stringify(request)}`)
		}
	}
}
