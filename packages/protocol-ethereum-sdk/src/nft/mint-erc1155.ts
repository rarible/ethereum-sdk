import { Ethereum } from "@rarible/ethereum-provider"
import { NftCollectionControllerApi } from "@rarible/protocol-api-client"
import { Address } from "@rarible/types"
import { createErc1155Contract } from "../order/contracts/erc1155"

export async function mintErc1155(
	ethereum: Ethereum,
	nftCollectionApi: NftCollectionControllerApi,
	contract: Address,
	minter: Address,
	to: Address,
	uri: string,
	amount: number,
): Promise<string> {
	const erc1155Contract = createErc1155Contract(ethereum, contract)
	const tokenId = await nftCollectionApi.generateNftTokenId({ collection: contract, minter })
	const tx = await erc1155Contract.send("mint", to, tokenId.tokenId, amount, uri)
	return tx.hash
}
