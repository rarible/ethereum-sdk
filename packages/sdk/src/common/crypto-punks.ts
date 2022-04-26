import type { EthereumTransaction } from "@rarible/ethereum-provider"

export interface CryptoPunksWrapper {
	approveForWrapper(punkId: number): Promise<EthereumTransaction>
	wrap(punkId: number): Promise<EthereumTransaction>
	unwrap(punkId: number): Promise<EthereumTransaction>
}
