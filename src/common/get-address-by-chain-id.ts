import { Address } from "@rarible/protocol-api-client"

export function getAddressByChainId(map: Record<number, Address>, chainId: number): Address {
	const result = map[chainId]
	if (result != null) {
		return result
	}
	throw Error(`Not supported chainId: ${chainId}`)
}
