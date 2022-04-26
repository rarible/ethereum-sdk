import type { EthereumTransaction } from "@rarible/ethereum-provider"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { Address } from "@rarible/types"
import type { SendFunction } from "../common/send-transaction"
import { createCryptoPunksWrapperContract } from "./contracts/cryptoPunks/cryptopunk-wrapper"
import { createCryptoPunksMarketContract } from "./contracts/cryptoPunks"

export async function approveForWrapper(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	checkWalletChainId: () => Promise<boolean>,
	marketContractAddress: Address,
	wrapperContractAddress: Address,
	punkIndex: number
): Promise<EthereumTransaction> {
	await checkWalletChainId()
	if (!ethereum) {
		throw new Error("Wallet undefined")
	}

	const marketContract = createCryptoPunksMarketContract(
		ethereum,
		marketContractAddress
	)

	return send(marketContract.functionCall(
		"offerPunkForSaleToAddress",
		punkIndex,
		0,
		wrapperContractAddress
	))
}

export async function wrapPunk(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	checkWalletChainId: () => Promise<boolean>,
	wrapperContractAddress: Address,
	punkIndex: number
): Promise<EthereumTransaction> {
	await checkWalletChainId()
	if (!ethereum) {
		throw new Error("Wallet undefined")
	}

	const wrapperContract = createCryptoPunksWrapperContract(
		ethereum,
		wrapperContractAddress
	)

	return send(wrapperContract.functionCall("wrap", punkIndex))
}

export async function unwrapPunk(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	checkWalletChainId: () => Promise<boolean>,
	wrapperContractAddress: Address,
	punkIndex: number
): Promise<EthereumTransaction> {
	await checkWalletChainId()
	if (!ethereum) {
		throw new Error("Wallet undefined")
	}
	const wrapperContract = createCryptoPunksWrapperContract(
		ethereum,
		wrapperContractAddress
	)

	return send(wrapperContract.functionCall("unwrap", punkIndex))
}
