import type { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { PromiEvent } from 'web3-core'
import Web3 from "web3"
import { backOff } from "exponential-backoff"
import { toBinary, toWord } from "@rarible/types"
import { toAddress } from "@rarible/types/build/address"
import { GatewayControllerApi } from "@rarible/protocol-api-client"

export async function sentTx(source: ContractSendMethod, options: SendOptions): Promise<string> {
	const event = source.send({ ...options, gas: 3000000 })
	return waitForHash(event)
}

export async function sendTransaction(
	notify: (hash: string) => Promise<void>, source: ContractSendMethod, options: SendOptions
): Promise<string> {
	const event = source.send(options)
	const hash = await waitForHash(event)
	await notify(hash)
	return hash
}

export async function createPendingLogs(api: GatewayControllerApi, web3: Web3, hash: string): Promise<void> {
	const tx = await getTransaction(web3, hash)
	const createTransactionRequest = {
		...tx,
		hash: toWord(hash),
		from: toAddress(tx.from),
		to: tx.to ? toAddress(tx.to) : undefined,
		input: toBinary(tx.input)
	}
	await api.createGatewayPendingTransactions({ createTransactionRequest })
}

function getTransaction(web3: Web3, hash: string) {
	return backOff(
		() => web3.eth.getTransaction(hash),
		{ maxDelay: 5000, numOfAttempts: 10, delayFirstAttempt: true, startingDelay: 300 }
	)
}

export async function waitForHash<T>(promiEvent: PromiEvent<T>): Promise<string> {
	return new Promise(((resolve, reject) => {
		promiEvent.on("transactionHash", hash => resolve(hash))
		promiEvent.on("error", error => reject(error))
	}))
}
