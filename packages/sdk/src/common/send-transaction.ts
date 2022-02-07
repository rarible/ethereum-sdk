import type { ContractSendMethod, SendOptions } from "web3-eth-contract"
import type { PromiEvent } from "web3-core"
import { toAddress, toBinary, toWord } from "@rarible/types"
import type { GatewayControllerApi } from "@rarible/ethereum-api-client"
import type {
	EthereumFunctionCall,
	EthereumSendOptions,
	EthereumTransaction,
} from "@rarible/ethereum-provider"
import type { AbstractLogger } from "@rarible/logger/build/domain"
import { LogsLevel } from "../types"

interface ILoggerConfig {
	instance: AbstractLogger
	level: LogsLevel
}

export type SendFunction = (
	functionCall: EthereumFunctionCall, options?: EthereumSendOptions,
) => Promise<EthereumTransaction>

type SendMethod = (
	api: GatewayControllerApi,
	checkChainId: () => Promise<boolean>,
	functionCall: EthereumFunctionCall,
	options?: EthereumSendOptions
) => Promise<EthereumTransaction>

export function getSendWithInjects(injects: {
	logger?: ILoggerConfig
} = {}): SendMethod {
	const logger = injects.logger

	return async function send(
		api: GatewayControllerApi,
		checkChainId: () => Promise<boolean>,
		functionCall: EthereumFunctionCall,
		options?: EthereumSendOptions
	): Promise<EthereumTransaction> {
		await checkChainId()
		const callInfo = await functionCall.getCallInfo()
		const logsAvailable = logger && logger.level && callInfo

		try {
			const tx = await functionCall.send(options)
			await createPendingLogs(api, tx)
			if (logsAvailable && logger.level >= LogsLevel.TRACE) {
				logger.instance.trace(callInfo.method, { from: callInfo.from, args: callInfo.args, tx })
			}
			return tx
		} catch (err: any) {
			if (logsAvailable && logger.level >= LogsLevel.ERROR && callInfo) {
				logger.instance.error(callInfo.method, { from: callInfo.from, args: callInfo.args, error: err.toString() })
			}
			throw err
		}
	}
}

type SimpleSendMethod = (
	checkChainId: () => Promise<boolean>,
	functionCall: EthereumFunctionCall,
	options?: EthereumSendOptions,
) => Promise<EthereumTransaction>

export function getSimpleSendWithInjects(injects: {
	logger?: ILoggerConfig
} = {}): SimpleSendMethod {
	const logger = injects.logger

	return async function simpleSend(
		checkChainId: () => Promise<boolean>,
		functionCall: EthereumFunctionCall,
		options?: EthereumSendOptions,
	) {
		const callInfo = await functionCall.getCallInfo()
		const logsAvailable = logger && logger.level && callInfo

		try {
			const tx = functionCall.send(options)
			if (logsAvailable && logger.level >= LogsLevel.TRACE) {
				logger.instance.trace(callInfo.method, { from: callInfo.from, args: callInfo.args, tx })
			}
			return tx
		} catch (err: any) {
			if (logsAvailable && logger.level >= LogsLevel.ERROR && callInfo) {
				logger.instance.error(callInfo.method, { from: callInfo.from, args: callInfo.args, error: err.toString() })
			}
			throw err
		}
	}
}

export async function createPendingLogs(api: GatewayControllerApi, tx: EthereumTransaction) {
	const createTransactionRequest = {
		hash: toWord(tx.hash),
		from: toAddress(tx.from),
		to: tx.to ? toAddress(tx.to) : undefined,
		input: toBinary(tx.data),
		nonce: tx.nonce,
	}
	return await api.createGatewayPendingTransactions({ createTransactionRequest })
}

export async function sentTx(source: ContractSendMethod, options: SendOptions): Promise<string> {
	const event = source.send({ ...options, gas: 3000000 })
	return waitForHash(event)
}

export async function waitForHash<T>(promiEvent: PromiEvent<T>): Promise<string> {
	return new Promise((resolve, reject) => {
		promiEvent.on("transactionHash", hash => resolve(hash))
		promiEvent.on("error", error => reject(error))
	})
}
