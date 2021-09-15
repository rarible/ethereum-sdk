import { Address, NftCollectionControllerApi } from "@rarible/protocol-api-client"

export async function getTokenId(nftCollectionApi: NftCollectionControllerApi, collection: Address, minter: Address) {
	return await nftCollectionApi.generateNftTokenId({ collection, minter })
}
