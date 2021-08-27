import type { PromiEvent } from "web3-core"

export function waitForConfirmation(promiEvent: PromiEvent<any>): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		promiEvent.on("confirmation", () => resolve())
		promiEvent.on("receipt", () => resolve())
		promiEvent.on("error", reject)
	})
}