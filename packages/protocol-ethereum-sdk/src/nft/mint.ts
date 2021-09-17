import type { Address, Binary, LazyErc1155, LazyErc721, NftCollectionControllerApi, NftLazyMintControllerApi, Part, NftItem, NftCollection, BigNumber } from "@rarible/protocol-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { SendFunction } from "../common/send-transaction"
import { mintOffChain } from "./mint-off-chain"
import { mintErc1155Legacy, mintErc1155New, mintErc721Legacy, mintErc721New } from "./mint-on-chain"
import type { SimpleLazyNft } from "./sign-nft"

type Collection<T extends NftCollection["type"], K extends NftCollection["supportsLazyMint"]> =
	& Pick<NftCollection, "id">
	& Partial<Pick<NftCollection, "features">>
	& {
		type: T
		supportsLazyMint: K
	}

export type AnyNFTCollection = Collection<NftCollection["type"], NftCollection["supportsLazyMint"]>
export type LegacyERC721Collection = Collection<"ERC721", false>
export type LazyERC721Collection = Collection<"ERC721", true>
export type LegacyERC1155Collection = Collection<"ERC1155", false>
export type LazyERC1155Collection = Collection<"ERC1155", true>


export type LegacyERC721Request = {
	collection: LegacyERC721Collection
	uri: string
	royalties: Array<Part>
}

export type ERC721Request = Omit<LazyErc721, "signatures" | "contract" | "tokenId" | "@type"> & {
	collection: LazyERC721Collection
	lazy: boolean
}

export type LegacyERC1155Request = {
	collection: LegacyERC1155Collection
	uri: string
	supply: number
	royalties: Array<Part>
}

export type ERC1155Request = Omit<LazyErc1155, "signatures" | "contract" | "tokenId" | "supply" | "@type"> & {
	collection: LazyERC1155Collection
	supply: number
	lazy: boolean
}

export type MintRequest = ERC721Request | ERC1155Request | LegacyERC721Request | LegacyERC1155Request

export type MintResponseCommon = {
	contract: Address
	tokenId: BigNumber
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

export function mint(
	ethereum: Ethereum,
	send: SendFunction,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintRequest
): Promise<MintOffChainResponse | MintOnChainResponse> {
	if (isERC721Request(data)) {
		if (data.lazy) return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		return mintErc721New(ethereum, send, nftCollectionApi, data)
	}
	if (isERC1155Request(data)) {
		if (data.lazy) return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		return mintErc1155New(ethereum, send, nftCollectionApi, data)
	}
	if (isLegacyERC721Request(data)) {
		return mintErc721Legacy(ethereum, send, nftCollectionApi, data)
	}
	if (isLegacyERC1155Request(data)) {
		return mintErc1155Legacy(ethereum, send, nftCollectionApi, data)
	}
	throw new Error("Mint request is not correct")
}

const isERC721Request = (data: MintRequest): data is ERC721Request => isLazyErc721Collection(data.collection)

const isLegacyERC721Request = (data: MintRequest): data is LegacyERC721Request =>
	isLegacyErc721Collection(data.collection)

const isERC1155Request = (data: MintRequest): data is ERC1155Request => isLazyErc1155Collection(data.collection)

const isLegacyERC1155Request = (data: MintRequest): data is LegacyERC1155Request =>
	isLegacyErc1155Collection(data.collection)

export const isLazyErc721Collection = (collection: AnyNFTCollection): collection is LazyERC721Collection =>
	collection.type === "ERC721" && isLazyCollection(collection)

export const isLegacyErc721Collection = (collection: AnyNFTCollection): collection is LegacyERC721Collection =>
	collection.type === "ERC721" && !isLazyCollection(collection)

export const isLazyErc1155Collection = (collection: AnyNFTCollection): collection is LazyERC1155Collection =>
	collection.type === "ERC1155" && isLazyCollection(collection)

export const isLegacyErc1155Collection = (collection: AnyNFTCollection): collection is LegacyERC1155Collection =>
	collection.type === "ERC1155" && !isLazyCollection(collection)

export function isLazyCollection(
	collection: AnyNFTCollection
): collection is LazyERC1155Collection | LazyERC721Collection {
	const supportsMintAndTransfer = (collection.features || []).indexOf("MINT_AND_TRANSFER") !== -1
	return Boolean(collection.supportsLazyMint || supportsMintAndTransfer)
}
