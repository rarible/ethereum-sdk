import { Address } from "@rarible/protocol-api-client"
import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { SendFunction } from "../common/send-transaction"
import { createErc721Contract } from "./contracts/erc721"

export async function approveErc721(
	ethereum: Ethereum,
	send: SendFunction,
	contract: Address,
	owner: Address,
	operator: Address
): Promise<EthereumTransaction | undefined> {
	const erc721 = createErc721Contract(ethereum, contract)
	const allowance: boolean = await erc721.functionCall("isApprovedForAll", owner, operator).call()
	if (!allowance) {
		return await send(erc721.functionCall("setApprovalForAll", operator, true))
	}
	return undefined
}
