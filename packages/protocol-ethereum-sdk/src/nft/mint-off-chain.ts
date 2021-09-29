import type { BigNumber, Binary, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { toBigNumber } from "@rarible/types"
import type { SimpleLazyNft } from "./sign-nft"
import { getTokenId } from "./get-token-id"
import { ERC1155RequestV2, ERC721RequestV3, MintOffChainResponse, MintResponseTypeEnum } from "./mint"

export async function mintOffChain(
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: ERC721RequestV3 | ERC1155RequestV2
): Promise<MintOffChainResponse> {
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, data.creators[0].account, data.nftTokenId)
	const mintData = getMintOffChainData(data, tokenId)
	const minted = await nftLazyMintApi.mintNftAsset({
		lazyNft: Object.assign({}, mintData, {
			tokenId,
			signatures: [await signNft(mintData)],
		}),
	})
	return {
		type: MintResponseTypeEnum.OFF_CHAIN,
		item: minted,
		owner: data.creators[0].account,
		tokenId,
		contract: minted.contract,
		itemId: `${minted.contract}:${tokenId}`,
	}
}

function getMintOffChainData(data: ERC721RequestV3 | ERC1155RequestV2, tokenId: BigNumber): SimpleLazyNft<"signatures"> {
	const base = {
		contract: data.collection.id,
		uri: data.uri,
		royalties: data.royalties,
		creators: data.creators,
		tokenId,
	}
	if ("supply" in data) {
		return Object.assign({}, base, {
			"@type": "ERC1155" as const,
			supply: toBigNumber(data.supply.toString()),
		})
	}
	return Object.assign({}, base, {
		"@type": "ERC721" as const,
	})
}
