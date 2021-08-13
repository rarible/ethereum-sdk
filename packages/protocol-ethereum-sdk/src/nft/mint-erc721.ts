import { Ethereum } from "@rarible/ethereum-provider"
import { NftCollectionControllerApi } from "@rarible/protocol-api-client"
import { Address } from "@rarible/types"
import { createErc721Contract } from "../order/contracts/erc721"

export async function mintErc721(
	ethereum: Ethereum,
	nftCollectionApi: NftCollectionControllerApi,
	contract: Address,
	minter: Address,
	to: Address,
	uri: string,
): Promise<string> {
	const erc721Contract = createErc721Contract(ethereum, contract)
	const tokenId = await nftCollectionApi.generateNftTokenId({ collection: contract, minter })
	const tx = await erc721Contract.send("mint", to, tokenId.tokenId, uri)
	return tx.hash
}
