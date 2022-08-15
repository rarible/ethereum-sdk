import type { EthereumSendOptions } from "@rarible/ethereum-provider"

export function hexifyOptionsValue(options: EthereumSendOptions): EthereumSendOptions {
	if (options.value) {
		return {
			...options,
			value: `0x${options.value.toString(16)}`,
		}
	}
	return options
}
