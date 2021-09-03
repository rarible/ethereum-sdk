import type { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { PromiEvent } from "web3-core"
import { toBinary, toWord } from "@rarible/types"
import { toAddress } from "@rarible/types/build/address"
import { GatewayControllerApi } from "@rarible/protocol-api-client"
import { EthereumFunctionCall, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"

export async function sentTx(source: ContractSendMethod, options: SendOptions): Promise<string> {
	const event = source.send({ ...options, gas: 3000000 })
	return waitForHash(event)
}

export async function send(
	api: GatewayControllerApi,
	functionCall: EthereumFunctionCall,
	options?: EthereumSendOptions
): Promise<EthereumTransaction> {
	const tx = await functionCall.send(options)
	await createPendingLogs(api, tx)
	return tx
}

export async function createPendingLogs(api: GatewayControllerApi, tx: EthereumTransaction) {
	const createTransactionRequest = {
		hash: toWord(tx.hash),
		from: toAddress(tx.from),
		to: tx.to ? toAddress(tx.to) : undefined,
		input: toBinary(tx.data),
	}
	// @ts-ignore //todo remove ts-ignore when updates protocol-api-client without nonce param
	return await api.createGatewayPendingTransactions({ createTransactionRequest })
}

export async function waitForHash<T>(promiEvent: PromiEvent<T>): Promise<string> {
	return new Promise((resolve, reject) => {
		promiEvent.on("transactionHash", hash => resolve(hash))
		promiEvent.on("error", error => reject(error))
	})
}
