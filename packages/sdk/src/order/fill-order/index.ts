import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { Action } from "@rarible/action"
import type { Address } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import type { AssetType } from "@rarible/ethereum-api-client"
import type {
	SimpleCryptoPunkOrder,
	SimpleLegacyOrder,
	SimpleOpenSeaV1Order,
	SimpleOrder,
	SimpleRaribleV2Order,
} from "../types"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import type { RaribleEthereumApis } from "../../common/apis"
import type { CheckAssetTypeFunction } from "../check-asset-type"
import { checkAssetType } from "../check-asset-type"
import { checkLazyAssetType } from "../check-lazy-asset-type"
import { checkChainId } from "../check-chain-id"
import type {
	CryptoPunksOrderFillRequest,
	FillOrderAction,
	FillOrderRequest,
	LegacyOrderFillRequest,
	OpenSeaV1OrderFillRequest,
	RaribleV2OrderFillRequest,
} from "./types"
import { RaribleV1OrderHandler } from "./rarible-v1"
import { RaribleV2OrderHandler } from "./rarible-v2"
import { OpenSeaOrderHandler } from "./open-sea"
import { CryptoPunksOrderHandler } from "./crypto-punks"
import type { OrderFillTransactionData, FillOrderStageId } from "./types"
import type { OrderFillSendData } from "./types"

export class OrderFiller {
	v1Handler: RaribleV1OrderHandler
	v2Handler: RaribleV2OrderHandler
	openSeaHandler: OpenSeaOrderHandler
	punkHandler: CryptoPunksOrderHandler
	private checkAssetType: CheckAssetTypeFunction
	private checkLazyAssetType: (type: AssetType) => Promise<AssetType>

	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly apis: RaribleEthereumApis,
		private readonly getBaseOrderFee: (type: SimpleOrder["type"]) => Promise<number>,
	) {
		this.getBaseOrderFillFee = this.getBaseOrderFillFee.bind(this)
		this.getTransactionData = this.getTransactionData.bind(this)
		this.v1Handler = new RaribleV1OrderHandler(ethereum, apis.order, send, config, getBaseOrderFee)
		this.v2Handler = new RaribleV2OrderHandler(ethereum, send, config, getBaseOrderFee)
		this.openSeaHandler = new OpenSeaOrderHandler(ethereum, send, config, getBaseOrderFee)
		this.punkHandler = new CryptoPunksOrderHandler(ethereum, send, config, getBaseOrderFee)
		this.checkAssetType = checkAssetType.bind(this, apis.nftCollection)
		this.checkLazyAssetType = checkLazyAssetType.bind(this, apis.nftItem)
	}

	private getFillAction<Request extends FillOrderRequest>(): Action<FillOrderStageId, Request, EthereumTransaction> {
		return Action
			.create({
				id: "approve" as const,
				run: async (request: Request) => {
					if (!this.ethereum) {
						throw new Error("Wallet undefined")
					}
					const from = toAddress(await this.ethereum.getFrom())
					const inverted = await this.invertOrder(request, from)
					if (request.assetType && inverted.make.assetType.assetClass === "COLLECTION") {
						inverted.make.assetType = await this.checkAssetType(request.assetType)
						inverted.make.assetType = await this.checkLazyAssetType(inverted.make.assetType)
					}
					await this.approveOrder(inverted, Boolean(request.infinite))
					return { request, inverted }
				},
			})
			.thenStep({
				id: "send-tx" as const,
				run: async ({ inverted, request }: { inverted: SimpleOrder, request: Request }) => {
					return this.sendTransaction(request, inverted)
				},
			})
			.before(async (input: Request) => {
				await checkChainId(this.ethereum, this.config)
				return input
			})
	}

	/**
	 * @deprecated Use {@link buy} or {@link acceptBid} instead
	 */
	fill: FillOrderAction = this.getFillAction()

	/**
	 * Buy order
	 */
	buy: FillOrderAction = this.getFillAction()

	/**
	 * Accept bid order
	 */
	acceptBid: FillOrderAction = this.getFillAction()

	private async invertOrder(request: FillOrderRequest, from: Address) {
		switch (request.order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.invert(<LegacyOrderFillRequest>request, from)
			case "RARIBLE_V2":
				return this.v2Handler.invert(<RaribleV2OrderFillRequest>request, from)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.invert(<OpenSeaV1OrderFillRequest>request, from)
			case "CRYPTO_PUNK":
				return this.punkHandler.invert(<CryptoPunksOrderFillRequest>request, from)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(request)}`)
		}
	}

	private async approveOrder(inverted: SimpleOrder, isInfinite: boolean) {
		switch (inverted.type) {
			case "RARIBLE_V1":
				return this.v1Handler.approve(inverted, isInfinite)
			case "RARIBLE_V2":
				return this.v2Handler.approve(inverted, isInfinite)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.approve(inverted, isInfinite)
			case "CRYPTO_PUNK":
				return this.punkHandler.approve(inverted, isInfinite)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	private async sendTransaction(request: FillOrderRequest, inverted: SimpleOrder) {
		switch (inverted.type) {
			case "RARIBLE_V1":
				return this.v1Handler.sendTransaction(
					<SimpleLegacyOrder>request.order,
					inverted,
					<LegacyOrderFillRequest>request
				)
			case "RARIBLE_V2":
				return this.v2Handler.sendTransaction(<SimpleRaribleV2Order>request.order, inverted)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.sendTransaction(<SimpleOpenSeaV1Order>request.order, inverted)
			case "CRYPTO_PUNK":
				return this.punkHandler.sendTransaction(<SimpleCryptoPunkOrder>request.order, inverted)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(inverted)}`)
		}
	}

	private async getTransactionRequestData(
		request: FillOrderRequest, inverted: SimpleOrder
	): Promise<OrderFillSendData> {
		switch (request.order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.getTransactionData(
          <SimpleLegacyOrder>request.order,
          <SimpleLegacyOrder>inverted,
          <LegacyOrderFillRequest>request
				)
			case "RARIBLE_V2":
				return this.v2Handler.getTransactionData(
          <SimpleRaribleV2Order>request.order,
          <SimpleRaribleV2Order>inverted,
				)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.getTransactionData(
          <SimpleOpenSeaV1Order>request.order,
          <SimpleOpenSeaV1Order>inverted,
				)
			case "CRYPTO_PUNK":
				return this.punkHandler.getTransactionData(
          <SimpleCryptoPunkOrder>request.order,
          <SimpleCryptoPunkOrder>inverted,
				)
			default:
				throw new Error(`Unsupported request: ${JSON.stringify(request)}`)
		}
	}

	async getTransactionData(
		request: FillOrderRequest
	): Promise<OrderFillTransactionData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		await checkChainId(this.ethereum, this.config)
		const from = toAddress(await this.ethereum.getFrom())
		const inverted = await this.invertOrder(request, from)
		if (request.assetType && inverted.make.assetType.assetClass === "COLLECTION") {
			inverted.make.assetType = await this.checkAssetType(request.assetType)
		}
		const {functionCall, options} = await this.getTransactionRequestData(request, inverted)
		return {
			data: functionCall.data,
			options,
		}
	}

	async getOrderFee(order: SimpleOrder): Promise<number> {
		switch (order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.getOrderFee(order)
			case "RARIBLE_V2":
				return this.v2Handler.getOrderFee(order)
			case "OPEN_SEA_V1":
				return this.openSeaHandler.getOrderFee(order)
			case "CRYPTO_PUNK":
				return this.punkHandler.getOrderFee()
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}

	async getBaseOrderFillFee(order: SimpleOrder): Promise<number> {
		switch (order.type) {
			case "RARIBLE_V1":
				return this.v1Handler.getBaseOrderFee()
			case "RARIBLE_V2":
				return this.v2Handler.getBaseOrderFee()
			case "OPEN_SEA_V1":
				return this.openSeaHandler.getBaseOrderFee()
			case "CRYPTO_PUNK":
				return this.punkHandler.getBaseOrderFee()
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}
}
