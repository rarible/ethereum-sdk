import {
	Binary,
	LazyErc1155,
	NftCollection,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
	Part,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { LazyErc721 } from "@rarible/protocol-api-client/build/models/LazyNft"
import { mintOffChain } from "./mint-off-chain"
import { mintErc1155Legacy, mintErc1155New, mintErc721Legacy, mintErc721New } from "./mint-on-chain"
import { SimpleLazyNft } from "./sign-nft"

export type MintRequest = LazyErc721Request | LazyErc1155Request | LegacyERC721Request | LegacyERC1155Request

export async function mint(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintRequest,
): Promise<string> {
	if (isLazy721Collection(data.collection)) {
		const dataLazy = data as LazyErc721Request
		if (dataLazy.lazy) {
			return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, dataLazy)
		} else {
			return await mintErc721New(ethereum, signNft, nftCollectionApi, dataLazy)
		}
	} else if (isLazy1155Collection(data.collection)) {
		const dataLazy = data as LazyErc1155Request
		if (dataLazy.lazy) {
			return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, dataLazy)
		} else {
			return await mintErc1155New(ethereum, signNft, nftCollectionApi, dataLazy)
		}
	} else if (isLegacyErc721Collection(data.collection)) {
		return await mintErc721Legacy(ethereum, signNft, nftCollectionApi, data as LegacyERC721Request)
	} else if (isLegacyErc1155Collection(data.collection)) {
		return await mintErc1155Legacy(ethereum, signNft, nftCollectionApi, data as LegacyERC1155Request)
	} else {
		throw new Error("Mint request is not correct")
	}
}

type ERC721Collection = Pick<NftCollection, "id" | "features"> & { type: "ERC721" }
type LegacyERC721Collection = ERC721Collection & { [lazySupported]: false }
type LazyERC721Collection = ERC721Collection & { [lazySupported]: true }

export function isLazy721Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LazyERC721Collection {
	return collection.type === "ERC721" && collection.features.indexOf("MINT_WITH_ADDRESS") !== -1
}

export function isLegacyErc721Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LegacyERC721Collection {
	return collection.type === "ERC721" && collection.features.indexOf("MINT_WITH_ADDRESS") === -1
}

export type LegacyERC721Request = {
	collection: LegacyERC721Collection
	uri: string
	royalties: Array<Part>
}

export type LazyErc721Request = {
	collection: LazyERC721Collection,
	lazy?: boolean
} & Omit<LazyErc721, "signatures" | "contract" | "tokenId" | "@type">

type ERC1155Collection = Pick<NftCollection, "id" | "features"> & { type: "ERC1155" }
type LegacyERC1155Collection = ERC1155Collection & { [lazySupported]: false }
type LazyERC1155Collection = ERC1155Collection & { [lazySupported]: true }

export function isLazy1155Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LazyERC1155Collection {
	return collection.type === "ERC1155" && collection.features.indexOf("MINT_WITH_ADDRESS") !== -1
}

export function isLegacyErc1155Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LegacyERC1155Collection {
	return collection.type === "ERC1155" && collection.features.indexOf("MINT_WITH_ADDRESS") === -1
}

export type LegacyERC1155Request = {
	collection: LegacyERC1155Collection
	uri: string
	supply: number
	royalties: Array<Part>
}

export type LazyErc1155Request = {
	collection: LazyERC1155Collection,
	lazy?: boolean
} & Omit<LazyErc1155, "signatures" | "contract" | "tokenId" | "@type">

declare const lazySupported: unique symbol


