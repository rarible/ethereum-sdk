import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address } from "@rarible/ethereum-api-client"
import { SendFunction } from "../common/send-transaction"
import { createCryptoPunksMarketContract } from "../nft/contracts/cryptoPunks"

export async function approveCryptoPunk(
	ethereum: Ethereum,
	send: SendFunction,
	contractAddress: Address,
	owner: Address,
	operator: Address,
	punkIndex: number,
): Promise<EthereumTransaction | undefined> {
	const marketContract = createCryptoPunksMarketContract(ethereum, contractAddress)
	const offer = await marketContract.functionCall("punksOfferedForSale", punkIndex).call()
	if (offer.isForSale && offer.onlySellTo.toLowerCase() === operator.toLowerCase() && offer.minValue === "0") {
		return undefined
	} else {
		return send(marketContract.functionCall("offerPunkForSaleToAddress", punkIndex, 0, operator))
	}
}
