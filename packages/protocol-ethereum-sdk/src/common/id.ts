import { Ethereum } from "@rarible/ethereum-provider"

export function id(ethereum: Ethereum, value: string): string {
	return ethereum.sha3(value).substring(0, 10)
}
