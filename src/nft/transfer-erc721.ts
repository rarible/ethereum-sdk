import Web3 from "web3"
import { Address } from "@rarible/protocol-api-client"
import { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { createErc721Contract } from "../order/contracts/erc721"
import { toAddress } from "@rarible/types"

export async function transferErc721(
	sentTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
	contract: Address,
	from: Address,
	to: Address,
	tokenId: string,
): Promise<string | undefined> {
	const erc721 = createErc721Contract(web3, contract)
	const ownership: Address = await erc721.methods.ownerOf(tokenId).call()
	if (toAddress(ownership) === toAddress(from)) {
		const [address] = await web3.eth.getAccounts()
		return sentTx(erc721.methods.safeTransferFrom(from, to, tokenId), { from: address })
	}
	return undefined
}
