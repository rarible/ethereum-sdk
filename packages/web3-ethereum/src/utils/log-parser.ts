import type { Log } from "web3-core"
import type Web3 from "web3"
import type * as EthereumProvider from "@rarible/ethereum-provider"
import type { AbiItem } from "web3-utils"

export function logParser(
	logs: Log[],
	abi: AbiItem[],
	web3: Web3
): EthereumProvider.EthereumTransactionEvent[] {
	const decoders = abi
		.filter(json => json.type === "event")
		.map(function(json) {
			return {
				...json,
				signature: web3.eth.abi.encodeEventSignature(json),
			}
		})

	return logs.map(log => {
		const decoder = decoders.find(decoder => {
			return decoder.signature === log.topics[0]
		})
		if (decoder) {
			const returnValues = web3.eth.abi.decodeLog(
				decoder.inputs as any,
				log.data,
				log.topics
			)
			return {
				...log,
				event: decoder.name || "",
				returnValues,
				args: returnValues,
			}
		}
		return {
			event: "",
			returnValues: {},
			args: {},
			...log,
		}
	})
}
