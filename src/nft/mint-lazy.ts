import Web3 from "web3"
import { Binary, NftCollectionControllerApi, NftItem, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { SimpleLazyNft } from "./sign-nft"

export type MintLazyRequest = SimpleLazyNft<"signatures" | "tokenId">

export async function mintLazy(
	web3: Web3,
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


