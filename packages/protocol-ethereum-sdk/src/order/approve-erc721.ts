import { Address } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { createErc721Contract } from "./contracts/erc721"

export async function approveErc721(
	ethereum: Ethereum,
	contract: Address,
	owner: Address,
	operator: Address,
): Promise<string | undefined> {
	const erc721 = createErc721Contract(ethereum, contract)
	const allowance: boolean = await erc721.functionCall("isApprovedForAll", owner, operator).call()
	if (!allowance) {
		const tx = await erc721.functionCall("setApprovalForAll", operator, true).call()
		return tx.hash
	}
	return undefined
}
