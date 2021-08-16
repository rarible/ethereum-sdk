import { Address } from "@rarible/protocol-api-client"
import { createErc1155Contract } from "../order/contracts/erc1155"
import { Ethereum } from "@rarible/ethereum-provider"

export async function transferErc1155(
	ethereum: Ethereum,
	contract: Address,
	from: Address,
	to: Address,
	tokenId: string | string[],
	tokenAmount: string | string[],
): Promise<string | undefined> {

	if (Array.isArray(tokenId) && Array.isArray((tokenAmount))) {
		if (tokenId.length === tokenAmount.length) {
			return await sendTransaction(ethereum, contract, from, to, tokenId, tokenAmount)
		} else {
			return undefined
		}
	} else if (typeof tokenId === "string" && typeof tokenAmount === "string") {
		return await sendTransaction(ethereum, contract, from, to, tokenId, tokenAmount)
	} else {
		return undefined
	}
}

async function sendTransaction(
	ethereum: Ethereum,
	contract: Address,
	from: Address,
	to: Address,
	tokenId: string | string[],
	tokenAmount: string | string[],
) {
	const erc1155 = createErc1155Contract(ethereum, contract)
	const tx = await erc1155.functionCall("safeBatchTransferFrom", from, to, tokenId, tokenAmount, '0x0').send({})
	return tx.hash
}
