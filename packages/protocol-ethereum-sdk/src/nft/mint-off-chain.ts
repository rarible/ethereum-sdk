import { SimpleLazyNft } from "./sign-nft"
import { Binary, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { getTokenId } from "./get-token-id"
import { MintLazyRequest } from "./mint"

export async function mintOffChain(
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintLazyRequest,
): Promise<string> {
	const { features } = await nftCollectionApi.getNftCollectionById({ collection: data.contract })

	if (features.includes("MINT_AND_TRANSFER")) {
		const { tokenId } = await getTokenId(nftCollectionApi, data.contract, data.creators[0].account)
		const signature = await signNft({ tokenId, ...data })
		const nftLazyItem = await nftLazyMintApi.mintNftAsset({
			lazyNft: {
				...data,
				tokenId,
				signatures: [signature],
			},
		})
		return nftLazyItem.tokenId
	} else {
		throw new Error("This collection doesn't support lazy minting")
	}
}
