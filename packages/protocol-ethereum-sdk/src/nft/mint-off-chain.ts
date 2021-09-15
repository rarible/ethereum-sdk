import { Binary, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { SimpleLazyNft } from "./sign-nft"
import { getTokenId } from "./get-token-id"
import { LazyErc1155Request, LazyErc721Request } from "./mint"

export async function mintOffChain(
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: LazyErc721Request | LazyErc1155Request
): Promise<string> {
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, data.creators[0].account)
	let nftData: SimpleLazyNft<"signatures">
	if ("supply" in data) {
		nftData = {
			"@type": data.collection.type,
			contract: data.collection.id,
			uri: data.uri,
			royalties: data.royalties,
			creators: data.creators,
			tokenId,
			supply: data.supply,
		}
	} else {
		nftData = {
			"@type": data.collection.type,
			contract: data.collection.id,
			uri: data.uri,
			royalties: data.royalties,
			creators: data.creators,
			tokenId,
		}
	}
	const signature = await signNft(nftData)
	const nftLazyItem = await nftLazyMintApi.mintNftAsset({
		lazyNft: {
			...nftData,
			tokenId,
			signatures: [signature],
		},
	})
	return `${nftLazyItem.contract}:${nftLazyItem.tokenId}:${data.creators[0]}`
}
