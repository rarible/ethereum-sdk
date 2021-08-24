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
	if ("creators" in data) {
		if (data.lazy) {
			/**
			 * Lazy minting
			 */
			return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		} else {
			/**
			 * On chain minting on new contracts
			 */
			if ("supply" in data) {
				return await mintErc1155New(ethereum, signNft, nftCollectionApi, data)
			} else {
				return await mintErc721New(ethereum, signNft, nftCollectionApi, data)
			}
		}
	} else {
		/**
		 * On chain minting on legacy contracts
		 */
		if ("supply" in data) {
			return await mintErc1155Legacy(ethereum, signNft, nftCollectionApi, data)
		} else {
			return await mintErc721Legacy(ethereum, signNft, nftCollectionApi, data)
		}
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


