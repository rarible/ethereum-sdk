import { Ethereum, EthereumContract } from "@rarible/ethereum-provider"
import { Address, BigNumber } from "@rarible/types"

export async function mintErc1155(
	ethereum: Ethereum,
	contract: EthereumContract,
	minter: Address,
	to: Address,
	uri: Buffer,
	tokenId: BigNumber,
	amount: number,
): Promise<string> {
	const tx = await contract.functionCall("mint", to, tokenId, amount, uri).send()
	return tx.hash
}
