import type { EthereumFunctionCall } from "@rarible/ethereum-provider"
import type { EthereumEstimateGasOptions } from "@rarible/ethereum-provider/src"
import { LogsLevel } from "../types"
import type { ILoggerConfig } from "./logger/logger"
import { getErrorMessageString } from "./logger/logger"

export type EstimateGasMethod = (
	functionCall: EthereumFunctionCall,
	options: EthereumEstimateGasOptions
) => Promise<number>

export function getEstimateGasInjects(injects: {
	logger?: ILoggerConfig
} = {}): EstimateGasMethod {
	const logger = injects.logger

	return async function estimateGas(
		functionCall: EthereumFunctionCall,
		options: EthereumEstimateGasOptions
	): Promise<number> {
		try {
			return await functionCall.estimateGas(options)
		} catch (err: any) {
			try {
				const callInfo = await functionCall.getCallInfo()
				const logsAvailable = logger && logger.level && callInfo
				if (logsAvailable && logger.level >= LogsLevel.ERROR && callInfo) {
					let data = undefined
					try {
						data = await functionCall.getData()
					} catch (e: any) {
						console.error("Unable to get tx data for log", e)
					}
					logger.instance.raw({
						level: "WARN",
						method: callInfo.method,
						message: {
							error: getErrorMessageString(err),
							from: callInfo.from,
							args: callInfo.args,
						},
						data,
					})
				}
			} catch (e) {
				console.error("Error while sending logs", e, err)
			}
			throw err
		}
	}
}
