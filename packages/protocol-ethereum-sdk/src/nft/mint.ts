/* eslint-disable camelcase */
import {
	Address,
	Binary,
	LazyErc1155,
	LazyErc721,
	NftCollection_Type,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
	Part,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { NftCollection_Features } from "@rarible/protocol-api-client/build/models/NftCollection"
import { SendFunction } from "../common/send-transaction"
import { mintOffChain } from "./mint-off-chain"
import { mintErc1155Legacy, mintErc1155New, mintErc721Legacy, mintErc721New } from "./mint-on-chain"
import { SimpleLazyNft } from "./sign-nft"

type Collection = { id: Address, features?: NftCollection_Features[], type: NftCollection_Type }

type ERC721Collection = Collection & { type: "ERC721" }
type LegacyERC721Collection = ERC721Collection & { supportsLazyMint: false }
type LazyERC721Collection = ERC721Collection & { supportsLazyMint: true }

export type LegacyERC721Request = {
	collection: LegacyERC721Collection
	uri: string
	royalties: Array<Part>
}

export type LazyErc721Request = {
	collection: LazyERC721Collection,
	lazy?: boolean
} & Omit<LazyErc721, "signatures" | "contract" | "tokenId" | "@type">

type ERC1155Collection = Collection & { type: "ERC1155" }
type LegacyERC1155Collection = ERC1155Collection & { supportsLazyMint: false }
type LazyERC1155Collection = ERC1155Collection & { supportsLazyMint: true }

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

export type MintRequest = LazyErc721Request | LazyErc1155Request | LegacyERC721Request | LegacyERC1155Request

export async function mint(
	ethereum: Ethereum,
	send: SendFunction,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintRequest
): Promise<string> {
	if (isLazyErc721Collection(data.collection)) {
		const dataLazy = data as LazyErc721Request
		if (dataLazy.lazy) {
			return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, dataLazy)
		} else {
			return await mintErc721New(ethereum, send, signNft, nftCollectionApi, dataLazy)
		}
	} else if (isLazyErc1155Collection(data.collection)) {
		const dataLazy = data as LazyErc1155Request
		if (dataLazy.lazy) {
			return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, dataLazy)
		} else {
			return await mintErc1155New(ethereum, send, signNft, nftCollectionApi, dataLazy)
		}
	} else if (isLegacyErc721Collection(data.collection)) {
		return await mintErc721Legacy(ethereum, send, signNft, nftCollectionApi, data as LegacyERC721Request)
	} else if (isLegacyErc1155Collection(data.collection)) {
		return await mintErc1155Legacy(ethereum, send, signNft, nftCollectionApi, data as LegacyERC1155Request)
	} else {
		throw new Error("Mint request is not correct")
	}
}

export function isLazyErc721Collection(
	collection: Collection
): collection is LazyERC721Collection {
	return collection.type === "ERC721" && isLazy(collection)
}

export function isLegacyErc721Collection(
	collection: Collection
): collection is LegacyERC721Collection {
	return collection.type === "ERC721" && !isLazy(collection)
}

export function isLazyErc1155Collection(
	collection: Collection
): collection is LazyERC1155Collection {
	return collection.type === "ERC1155" && isLazy(collection)
}

export function isLegacyErc1155Collection(
	collection: Collection
): collection is LegacyERC1155Collection {
	return collection.type === "ERC1155" && !isLazy(collection)
}

function isLazy(collection: { features?: string[] }) {
	return (collection.features || []).indexOf("MINT_AND_TRANSFER") !== -1 || Boolean((collection as any).supportsLazyMint)
}
