import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { Part } from "@rarible/ethereum-api-client"
import type { BigNumber } from "@rarible/types"
import { toBigNumber } from "@rarible/types/build/big-number"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { getRequiredWallet } from "../../common/get-required-wallet"
import type { SimpleOrder } from "../types"
import type { EthereumNetwork, IRaribleEthereumSdkConfig } from "../../types"
import type { EstimateGasMethod } from "../../common/estimate-gas"
import { createExchangeWrapperContract } from "../contracts/exchange-wrapper"
import type { OrderFillSendData, AmmOrderFillRequest } from "./types"
import { SudoswapFill } from "./amm/sudoswap-fill"
import type { PreparedOrderRequestDataForExchangeWrapper } from "./types"
import { calcValueWithFees, originFeeValueConvert } from "./common/origin-fees-utils"
import { ExchangeWrapperOrderType } from "./types"

export class AmmOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly estimateGas: EstimateGasMethod,
		private readonly config: EthereumConfig,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
		private readonly env: EthereumNetwork,
		private readonly sdkConfig?: IRaribleEthereumSdkConfig,
		private readonly options: {directBuy: boolean} = {directBuy: false},
	) {}

	async getTransactionData(request: AmmOrderFillRequest): Promise<OrderFillSendData> {
		const ethereum = getRequiredWallet(this.ethereum)
		const fillData = await this.getTransactionDataDirectBuy(request)

		if (this.options.directBuy) { // direct buy with sudoswap contract
			if (request.originFees?.length) {
				throw new Error("Origin fees not supported for sudoswap direct buy")
			}

			await this.estimateGas(fillData.functionCall, {
				from: await ethereum.getFrom(),
				value: fillData.options.value,
			})

			return {
				functionCall: fillData.functionCall,
				options: fillData.options,
			}
		} else { // buy with rarible wrapper
			const wrapperContract = createExchangeWrapperContract(ethereum, this.config.exchange.wrapper)

			const { totalFeeBasisPoints, encodedFeesValue, feeAddresses } = originFeeValueConvert(request.originFees)
			const valueForSending = calcValueWithFees(toBigNumber(fillData.options.value?.toString() ?? "0"), totalFeeBasisPoints)

			const data = {
				marketId: ExchangeWrapperOrderType.AAM,
				amount: fillData.options.value,
				fees: encodedFeesValue,
				data: await fillData.functionCall.getData(),
			}

			const functionCall = wrapperContract.functionCall(
				"singlePurchase",
				data,
				feeAddresses[0],
				feeAddresses[1]
			)

			await this.estimateGas(functionCall, {
				from: await ethereum.getFrom(),
				value: valueForSending.toString(),
			})

			return {
				functionCall: functionCall,
				options: {
					...fillData.options,
					value: valueForSending.toString(),
				},
			}
		}
	}

	private async getTransactionDataDirectBuy(request: AmmOrderFillRequest): Promise<OrderFillSendData> {
		const ethereum = getRequiredWallet(this.ethereum)

		let fillData: OrderFillSendData
		switch (request.order.data.dataType) {
			case "SUDOSWAP_AMM_DATA_V1":
				fillData = await SudoswapFill.getDirectFillData(ethereum, request, this.config, this.sdkConfig)
				break
			default:
				throw new Error("Unsupported order data type " + request.order.data.dataType)
		}

		return {
			functionCall: fillData.functionCall,
			options: fillData.options,
		}
	}

	async sendTransaction(request: AmmOrderFillRequest): Promise<EthereumTransaction> {
		const { functionCall, options } = await this.getTransactionData(request)
		return this.send(functionCall, options)
	}

	async getTransactionDataForExchangeWrapper(
		request: AmmOrderFillRequest,
		originFees: Part[] | undefined,
		feeValue: BigNumber,
	): Promise<PreparedOrderRequestDataForExchangeWrapper> {
		if (request.order.take.assetType.assetClass !== "ETH") {
			throw new Error("Unsupported asset type for take asset " + request.order.take.assetType.assetClass)
		}

		const {functionCall, options} = await this.getTransactionDataDirectBuy(request)

		const { totalFeeBasisPoints } = originFeeValueConvert(originFees)
		const valueForSending = calcValueWithFees(toBigNumber(options.value?.toString() ?? "0"), totalFeeBasisPoints)

		return {
			data: {
				marketId: ExchangeWrapperOrderType.AAM,
				amount: request.order.take.value,
				fees: feeValue,
				data: await functionCall.getData(),
			},
			options: {
				value: valueForSending.toString(),
			},
		}
	}

	getBaseOrderFee() {
		return this.getBaseOrderFeeConfig("AMM")
	}

	getOrderFee(): number {
		return 0
	}
}
