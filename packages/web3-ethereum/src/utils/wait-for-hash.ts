import type { PromiEvent } from "web3-core"

export function waitForHash(promiEvent: PromiEvent<any>): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		promiEvent.on("transactionHash", resolve)
		promiEvent.on("receipt", r => resolve(r.transactionHash))
		promiEvent.on("error", reject)
	})
}