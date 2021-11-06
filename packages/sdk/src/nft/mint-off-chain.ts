import type {
	BigNumber,
	Binary,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/ethereum-api-client"
import { toBigNumber } from "@rarible/types"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { Part } from "@rarible/ethereum-api-client"
import type { SimpleLazyNft } from "./sign-nft"
import { getTokenId } from "./get-token-id"
import type { ERC1155RequestV2, ERC721RequestV3, MintOffChainResponse} from "./mint"
import { MintResponseTypeEnum } from "./mint"
import { getCreators } from "./mint-on-chain"

export async function mintOffChain(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: ERC721RequestV3 | ERC1155RequestV2
): Promise<MintOffChainResponse> {
	const creators = await getCreators(data, ethereum)
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, creators[0].account, data.nftTokenId)
	const mintData = getMintOffChainData(data, creators, tokenId)
	const minted = await nftLazyMintApi.mintNftAsset({
		lazyNft: Object.assign({}, mintData, {
			tokenId,
			signatures: [await signNft(mintData)],
		}),
	})
	return {
		type: MintResponseTypeEnum.OFF_CHAIN,
		item: minted,
		owner: creators[0].account,
		tokenId,
		contract: minted.contract,
		itemId: `${minted.contract}:${tokenId}`,
	}
}

function getMintOffChainData(data: ERC721RequestV3 | ERC1155RequestV2, creators: Part[], tokenId: BigNumber): SimpleLazyNft<"signatures"> {
	const base = {
		contract: data.collection.id,
		uri: data.uri,
		royalties: data.royalties || [],
		creators,
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
