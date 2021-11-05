import type { PromiEvent, TransactionReceipt } from "web3-core"

export function toPromises(promiEvent: PromiEvent<any>) {
	return {
		hash: new Promise<string>((resolve, reject) => {
			promiEvent.on("error", reject)
			promiEvent.on("transactionHash", resolve)
		}),
		receipt: new Promise<TransactionReceipt>((resolve, reject) => {
			promiEvent.on("error", reject)
			promiEvent.on("receipt", resolve)
		}),
	}
}
