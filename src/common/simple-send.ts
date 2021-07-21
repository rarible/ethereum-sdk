import { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { waitForHash } from "./send-transaction"

export async function simpleSend(source: ContractSendMethod, options: SendOptions): Promise<string> {
	const event = source.send({ ...options, gas: 3000000 })
	return waitForHash(event)
}
