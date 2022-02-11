import type { AxiosResponse } from "axios"
import axios from "axios"
import type { EthereumConfig } from "../config/type"
import type { EthereumNetwork } from "../types"
import type { SimpleOrder } from "../order/types"
import { CURRENT_ORDER_TYPE_VERSION } from "./order"

export async function getBaseFee(
	config: EthereumConfig,
	env: EthereumNetwork,
	type: SimpleOrder["type"] | "AUCTION" = CURRENT_ORDER_TYPE_VERSION
): Promise<number> {
	const commonFeeConfigResponse: AxiosResponse<CommonFeeConfig> = await axios.get(config.feeConfigUrl)
	const envFeeConfig = commonFeeConfigResponse.data[env]

	if (!(type in envFeeConfig)) {
		throw new Error(`Unsupported fee type ${type}`)
	}

	return Number(envFeeConfig[type] || 0)
}

export type CommonFeeConfig = Record<EthereumNetwork, EnvFeeConfig>
export type EnvFeeConfig = Record<SimpleOrder["type"] | "AUCTION", number>
