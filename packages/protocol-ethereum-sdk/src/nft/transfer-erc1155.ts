import { Address } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { createErc1155Contract } from "../order/contracts/erc1155"

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
			throw new Error("Length of token amounts and token id's isn't equal")
		}
	} else {
		return await sendTransaction(ethereum, contract, from, to, tokenId, tokenAmount)
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
	if (Array.isArray(tokenId) && Array.isArray(tokenAmount)) {
		const tx = await erc1155.functionCall("safeBatchTransferFrom", from, to, tokenId, tokenAmount, '0x0').send({ gas: 200000 })
		return tx.hash
	}
	const tx = await erc1155.functionCall("safeTransferFrom", from, to, tokenId, tokenAmount, '0x0').send({ gas: 200000 })
	return tx.hash
}
