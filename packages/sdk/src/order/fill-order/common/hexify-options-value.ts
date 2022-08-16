import type { EthereumSendOptions } from "@rarible/ethereum-provider"
import { toBn } from "@rarible/utils/build/bn"

export function hexifyOptionsValue(options: EthereumSendOptions): EthereumSendOptions {
	if (options.value) {
		return {
			...options,
			value: `0x${toBn(options.value).toString(16)}`,
		}
	}
	return options
}
