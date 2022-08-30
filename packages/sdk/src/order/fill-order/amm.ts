import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { SendFunction } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { getRequiredWallet } from "../../common/get-required-wallet"
import type { SimpleOrder } from "../types"
import type { EthereumNetwork, IRaribleEthereumSdkConfig } from "../../types"
import type { EstimateGasMethod } from "../../common/estimate-gas"
import type { OrderFillSendData, AmmOrderFillRequest } from "./types"
import { SudoswapFill } from "./amm/sudoswap-fill"

export class AmmOrderHandler {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly estimateGas: EstimateGasMethod,
		private readonly config: EthereumConfig,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
		private readonly env: EthereumNetwork,
		private readonly sdkConfig?: IRaribleEthereumSdkConfig
	) {}

	async getTransactionData(
		request: AmmOrderFillRequest
	): Promise<OrderFillSendData> {
		const ethereum = getRequiredWallet(this.ethereum)

		let fillData: OrderFillSendData
		switch (request.order.data.dataType) {
			case "SUDOSWAP_AMM_DATA_V1":
				fillData = await SudoswapFill.getDirectFillData(ethereum, request, this.config, this.sdkConfig)
				break
			default:
				throw new Error("Unsupported order data type " + request.order.data.dataType)

		}

		await this.estimateGas(fillData.functionCall, {
			from: await ethereum.getFrom(),
			value: fillData.options.value,
		})

		return {
			functionCall: fillData.functionCall,
			options: fillData.options,
		}
	}

	async sendTransaction(request: AmmOrderFillRequest): Promise<EthereumTransaction> {
		const {functionCall, options} = await this.getTransactionData(request)
		return this.send(functionCall, options)
	}

	getBaseOrderFee() {
		return this.getBaseOrderFeeConfig("AMM")
	}

	getOrderFee(): number {
		return 0
	}
}
