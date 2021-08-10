import { Address } from "@rarible/protocol-api-client"
import { Ethereum } from "../../../ethereum-provider"
import { createErc1155Contract } from "./contracts/erc1155"

export async function approveErc1155(
	ethereum: Ethereum,
	contract: Address,
	owner: Address,
	operator: Address,
): Promise<string | undefined> {
	const erc1155 = createErc1155Contract(ethereum, contract)
	const allowance: boolean = await erc1155.call("isApprovedForAll", owner, operator)
	if (!allowance) {
		const tx = await erc1155.send("setApprovalForAll", operator, true)
		return tx.hash
	}
	return undefined
}
