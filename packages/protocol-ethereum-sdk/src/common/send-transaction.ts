import type { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { PromiEvent } from "web3-core"
import { backOff } from "exponential-backoff"
import { toBinary, toWord } from "@rarible/types"
import { toAddress } from "@rarible/types/build/address"
import { GatewayControllerApi } from "@rarible/protocol-api-client"
import { LogEvent } from "@rarible/protocol-api-client/build/models"
import { Ethereum } from "@rarible/ethereum-provider"

export async function sentTx(source: ContractSendMethod, options: SendOptions): Promise<string> {
	const event = source.send({ ...options, gas: 3000000 })
	return waitForHash(event)
}

export async function sendTransaction(
	notify: (hash: string) => Promise<void>,
	source: ContractSendMethod,
	options: SendOptions
): Promise<string> {
	const event = source.send(options)
	const hash = await waitForHash(event)
	await notify(hash)
	return hash
}

export async function createPendingLogs(
	api: GatewayControllerApi,
	ethereum: Ethereum,
	hash: string
): Promise<Array<LogEvent>> {
	const tx = await getTransaction(ethereum, hash)
	const createTransactionRequest = {
		...tx,
		hash: toWord(hash),
		from: toAddress(tx.from),
		to: tx.to ? toAddress(tx.to) : undefined,
		input: toBinary(tx?.input || ""),
	}
	return api.createGatewayPendingTransactions({ createTransactionRequest })
}

function getTransaction(ethereum: Ethereum, hash: string) {
	return backOff(() => ethereum.getTransaction(hash), {
		maxDelay: 5000,
		numOfAttempts: 10,
		delayFirstAttempt: true,
		startingDelay: 300,
	})
}

export async function waitForHash<T>(promiEvent: PromiEvent<T>): Promise<string> {
	return new Promise((resolve, reject) => {
		promiEvent.on("transactionHash", hash => resolve(hash))
		promiEvent.on("error", error => reject(error))
	})
}
