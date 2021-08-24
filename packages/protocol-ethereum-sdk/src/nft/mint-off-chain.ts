import { Binary, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { SimpleLazyNft } from "./sign-nft"
import { getTokenId } from "./get-token-id"
import { LazyErc1155Request, LazyErc721Request } from "./mint"

export async function mintOffChain(
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: LazyErc721Request | LazyErc1155Request,
): Promise<string> {
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, data.creators[0].account)
	let nftData: SimpleLazyNft<"signatures">
	switch (data.collection.type) {
		case "ERC721": {
			nftData = {
				"@type": data.collection.type,
				contract: data.collection.id,
				uri: '',
				royalties: data.royalties,
				creators: data.creators,
				tokenId,
			}
		}
		case "ERC1155": {
			if ("supply" in data) {
				nftData = {
					"@type": data.collection.type,
					contract: data.collection.id,
					uri: '',
					royalties: data.royalties,
					creators: data.creators,
					tokenId,
					supply: data.supply,
				}
			} else {
				throw new Error("Key 'supply' doesn't exist in Erc1155 mint request")
			}
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
	return nftLazyItem.tokenId
}
