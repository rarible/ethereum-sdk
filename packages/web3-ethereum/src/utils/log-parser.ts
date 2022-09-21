import type * as EthereumProvider from "@rarible/ethereum-provider"
import type { AbiItem } from "web3-utils"
import type { TransactionReceipt } from "web3-core"
// @ts-ignore
import parseReceiptEvents from "web3-parse-receipt-events"

export async function getContractMethodReceiptEvents(
	receiptPromise: Promise<TransactionReceipt>
): Promise<EthereumProvider.EthereumTransactionEvent[]> {
	const receipt = await receiptPromise
	return receipt.events ? Object.keys(receipt.events!)
		.map(ev => receipt.events![ev])
		.map(ev => ({
			...ev,
			args: ev.returnValues,
		})) : []
}

export async function getTransactionReceiptEvents(
	receiptPromise: Promise<TransactionReceipt>,
	address: string,
	abi: AbiItem[],
): Promise<EthereumProvider.EthereumTransactionEvent[]> {
	const eventsResponse = parseReceiptEvents(
		abi,
		address,
		await receiptPromise
	)
	return Object.values(eventsResponse.events) || []
}
