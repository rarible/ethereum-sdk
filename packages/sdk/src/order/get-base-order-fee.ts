import fetch from "node-fetch"
import type { EthereumConfig } from "../config/type"
import { CURRENT_ORDER_TYPE_VERSION } from "../common/order"
import type { EthereumNetwork } from "../types"
import type { SimpleOrder } from "./types"

export async function getBaseOrderConfigFee(
	config: EthereumConfig,
	env: EthereumNetwork,
	type: SimpleOrder["type"] = CURRENT_ORDER_TYPE_VERSION
): Promise<number> {
	const commonFeeConfigResponse = await fetch(config.feeConfigUrl)
	const commonFeeConfig: CommonFeeConfig = await commonFeeConfigResponse.json()
	const envFeeConfig = commonFeeConfig[env]

	if (!(type in envFeeConfig)) {
		throw new Error(`Unsupported order type ${type}`)
	}

	return Number(envFeeConfig[type])
}

export type CommonFeeConfig = Record<EthereumNetwork, EnvFeeConfig>
export type EnvFeeConfig = Record<SimpleOrder["type"], number>
