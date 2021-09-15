/* eslint-disable camelcase */
import type { Address, Binary, LazyErc1155, LazyErc721, NftCollectionControllerApi, NftLazyMintControllerApi, Part, NftTokenId, NftItem } from "@rarible/protocol-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { NftCollection_Features } from "@rarible/protocol-api-client/build/models/NftCollection"
import type { SendFunction } from "../common/send-transaction"
import { mintOffChain } from "./mint-off-chain"
import { mintErc1155Legacy, mintErc1155New, mintErc721Legacy, mintErc721New } from "./mint-on-chain"
import type { SimpleLazyNft } from "./sign-nft"

export enum NftCollectionTypeEnum {
	ERC721_LEGACY = "ERC721-legacy",
	ERC721 = "ERC721",
	ERC1155_LEGACY = "ERC1155-legacy",
	ERC1155 = "ERC1155",
}

type CollectionBase = {
	id: Address
	features?: NftCollection_Features[]
	type: NftCollectionTypeEnum
}

export type LegacyERC721Collection = CollectionBase & { type: NftCollectionTypeEnum.ERC721_LEGACY }
export type ERC721Collection = CollectionBase & { type: NftCollectionTypeEnum.ERC721 }

export type LegacyERC721Request = {
	type: NftCollectionTypeEnum.ERC721_LEGACY
	collection: LegacyERC721Collection
	uri: string
	royalties: Array<Part>
}

export type ERC721Request = Omit<LazyErc721, "signatures" | "contract" | "tokenId" | "@type"> & {
	type: NftCollectionTypeEnum.ERC721
	collection: ERC721Collection
	lazy?: boolean
}

export type LegacyERC1155Collection = CollectionBase & { type: NftCollectionTypeEnum.ERC1155_LEGACY }
export type ERC1155Collection = CollectionBase & { type: NftCollectionTypeEnum.ERC1155 }
export type NftCollection =
	| LegacyERC1155Collection
	| ERC1155Collection
	| LegacyERC721Collection
	| ERC721Collection

export type LegacyERC1155Request = {
	type: NftCollectionTypeEnum.ERC1155_LEGACY
	collection: LegacyERC1155Collection
	uri: string
	supply: number
	royalties: Array<Part>
}

export type ERC1155Request = Omit<LazyErc1155, "signatures" | "contract" | "tokenId" | "@type"> & {
	type: NftCollectionTypeEnum.ERC1155
	collection: ERC1155Collection
	lazy?: boolean
}

export type MintRequest = ERC721Request | ERC1155Request | LegacyERC721Request | LegacyERC1155Request

export type MintResponseCommon = {
	contract: Address
	nftTokenId: NftTokenId
	owner: Address
	itemId: string
}

export enum MintResponseTypeEnum {
	OFF_CHAIN = "off-chain",
	ON_CHAIN = "on-chain"
}

export type MintOffChainResponse = MintResponseCommon & {
	type: MintResponseTypeEnum.OFF_CHAIN
	item: NftItem
}

export type MintOnChainResponse = MintResponseCommon & {
	type: MintResponseTypeEnum.ON_CHAIN
	transaction: EthereumTransaction
}

export async function mint(
	ethereum: Ethereum,
	send: SendFunction,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintRequest
): Promise<MintOffChainResponse | MintOnChainResponse> {
	if (data.type === NftCollectionTypeEnum.ERC721) {
		if (data.lazy) return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		return mintErc721New(ethereum, send, nftCollectionApi, data)
	}
	if (data.type === NftCollectionTypeEnum.ERC1155) {
		if (data.lazy) return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		return mintErc1155New(ethereum, send, nftCollectionApi, data)
	}
	if (data.type === NftCollectionTypeEnum.ERC721_LEGACY) {
		return mintErc721Legacy(ethereum, send, nftCollectionApi, data)
	}
	if (data.type === NftCollectionTypeEnum.ERC1155_LEGACY) {
		return mintErc1155Legacy(ethereum, send, nftCollectionApi, data)
	}
	throw new Error("Mint request is not correct")
}
