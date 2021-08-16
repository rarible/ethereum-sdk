import { Address } from "@rarible/protocol-api-client"
import { createErc721Contract } from "../order/contracts/erc721"
import { toAddress } from "@rarible/types"
import { Ethereum } from "@rarible/ethereum-provider"

export async function transferErc721(
	ethereum: Ethereum,
	contract: Address,
	from: Address,
	to: Address,
	tokenId: string,
): Promise<string | undefined> {
	const erc721 = createErc721Contract(ethereum, contract)
	const ownership: Address = await erc721.functionCall("ownerOf", tokenId).call()
	if (toAddress(ownership) === toAddress(from)) {
		const tx = await erc721.functionCall("safeTransferFrom", from, to, tokenId).send()
		return tx.hash
	}
	return undefined
}
