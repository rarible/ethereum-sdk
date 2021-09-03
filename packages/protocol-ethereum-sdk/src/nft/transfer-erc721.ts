import { Address } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { createErc721Contract } from "../order/contracts/erc721"
import { SendFunction } from "../common/send-transaction"

export async function transferErc721(
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	from: Address,
	to: Address,
	tokenId: string
): Promise<string> {
	const erc721 = createErc721Contract(ethereum, contract)
	const tx = await send(erc721.functionCall("safeTransferFrom", from, to, tokenId))
	return tx.hash
}
