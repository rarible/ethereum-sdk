import { Ethereum, EthereumContract } from "@rarible/ethereum-provider"
import { Address, BigNumber } from "@rarible/types"

export async function mintErc721(
	ethereum: Ethereum,
	contract: EthereumContract,
	minter: Address,
	to: Address,
	uri: string,
	tokenId: BigNumber,
): Promise<string> {
	const tx = await contract.functionCall("mint", to, tokenId, uri).send()
	return tx.hash
}
