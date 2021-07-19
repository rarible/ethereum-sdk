import Web3 from "web3"

export function id(s: string) {
	return Web3.utils.sha3(s)!.substring(0, 10)
}
