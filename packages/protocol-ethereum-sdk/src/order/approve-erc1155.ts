import { Address } from "@rarible/ethereum-api-client"
import { EthereumTransaction } from "@rarible/ethereum-provider"
import { Ethereum } from "../../../ethereum-provider"
import { SendFunction } from "../common/send-transaction"
import { createErc1155Contract } from "./contracts/erc1155"

export async function approveErc1155(
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	owner: Address,
	operator: Address
): Promise<EthereumTransaction | undefined> {
	const erc1155 = createErc1155Contract(ethereum, contract)
	const allowance: boolean = await erc1155.functionCall("isApprovedForAll", owner, operator).call()
	if (!allowance) {
		return send(erc1155.functionCall("setApprovalForAll", operator, true))
	}
	return undefined
}
