import type { EthereumFunctionCall } from "@rarible/ethereum-provider"
import { toBinary } from "@rarible/types"
import { FILL_CALLDATA_TAG } from "../../../config/common"
import type { IRaribleEthereumSdkConfig } from "../../../types"

const hexRegexp = /^[0-9a-f]*$/g

export function getUpdatedCall(functionCall: EthereumFunctionCall, sdkConfig?: IRaribleEthereumSdkConfig) {
	if (sdkConfig?.fillCalldata) {
		const fillCalldata = toBinary(sdkConfig.fillCalldata).slice(2)
		if (!hexRegexp.test(fillCalldata)) {
			throw new Error("Fill calldata is not a hex value")
		}
		if (fillCalldata.length !== 48) {
			throw new Error(`Fill call data has length = ${fillCalldata.length}, but should be = 48`)
		}
		functionCall.data = `${functionCall.data}${fillCalldata}${FILL_CALLDATA_TAG}`
	}
	return functionCall
}
