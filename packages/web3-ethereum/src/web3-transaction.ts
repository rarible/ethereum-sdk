import type * as EthereumProvider from "@rarible/ethereum-provider"
import type { TransactionReceipt } from "web3-core"
import type { Address, Binary, Word } from "@rarible/types"

export class Web3Transaction implements EthereumProvider.EthereumTransaction {
	constructor(
		private readonly receipt: Promise<TransactionReceipt>,
		public readonly hash: Word,
		public readonly data: Binary,
		public readonly nonce: number,
		public readonly from: Address,
		public readonly to?: Address
	) {
	}

	async wait(): Promise<EthereumProvider.EthereumTransactionReceipt> {
		const receipt = await this.receipt
		const events: EthereumProvider.EthereumTransactionEvent[] = Object.keys(receipt.events!)
			.map(ev => receipt.events![ev])
			.map(ev => ({
				...ev,
				args: ev.returnValues,
			}))
		return {
			...receipt,
			events,
		}
	}
}
