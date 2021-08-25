import { Binary, NftCollectionControllerApi, NftItem, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { SimpleLazyNft } from "./sign-nft"

export type MintLazyRequest = SimpleLazyNft<"signatures" | "tokenId">

export async function mintLazy(
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollection: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	mintLazyRequest: MintLazyRequest,
): Promise<NftItem> {

	const { tokenId } = await nftCollection.generateNftTokenId({
			collection: mintLazyRequest.contract,
			minter: mintLazyRequest.creators[0].account,
		},
	)

	const signature = await signNft({ tokenId, ...mintLazyRequest })

	return await nftLazyMintApi.mintNftAsset({
		lazyNft: {
			...mintLazyRequest,
			tokenId,
			signatures: [signature],
		},
	})
}


