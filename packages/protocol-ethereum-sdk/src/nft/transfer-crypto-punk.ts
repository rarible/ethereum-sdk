import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address } from "@rarible/ethereum-api-client"
import { SendFunction } from "../common/send-transaction"
import { createCryptoPunksMarketContract } from "./contracts/cryptoPunks"

export async function transferCryptoPunk(
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	to: Address,
	punkIndex: number
): Promise<EthereumTransaction> {
	const cryptoPunkMarket = createCryptoPunksMarketContract(ethereum, contract)
	return send(cryptoPunkMarket.functionCall("transferPunk", to, punkIndex))
}
