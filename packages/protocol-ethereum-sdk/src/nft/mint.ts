import type { Address, Binary, LazyErc1155, LazyErc721, NftCollectionControllerApi, NftLazyMintControllerApi, Part, NftTokenId, NftItem, NftCollection } from "@rarible/protocol-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { SendFunction } from "../common/send-transaction"
import { mintOffChain } from "./mint-off-chain"
import { mintErc1155Legacy, mintErc1155New, mintErc721Legacy, mintErc721New } from "./mint-on-chain"
import type { SimpleLazyNft } from "./sign-nft"

export enum NftCollectionTypeEnum {
	ERC721 = "ERC721",
	ERC1155 = "ERC1155",
}

export type MintRequestCollection =
	& Pick<NftCollection, "id">
	& Partial<Pick<NftCollection, "features" | "supportsLazyMint">>

export type LegacyERC721Request = {
	type: NftCollectionTypeEnum.ERC721
	collection: MintRequestCollection
	uri: string
	royalties: Array<Part>
}

export type ERC721Request = Omit<LazyErc721, "signatures" | "contract" | "tokenId" | "@type"> & {
	type: NftCollectionTypeEnum.ERC721
	collection: MintRequestCollection
	lazy?: boolean
}

export type LegacyERC1155Request = {
	type: NftCollectionTypeEnum.ERC1155
	collection: MintRequestCollection
	uri: string
	supply: number
	royalties: Array<Part>
}

export type ERC1155Request = Omit<LazyErc1155, "signatures" | "contract" | "tokenId" | "@type"> & {
	type: NftCollectionTypeEnum.ERC1155
	collection: MintRequestCollection
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
	if (isERC721Request(data)) {
		if (data.lazy) {
			return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		}
		return mintErc721New(ethereum, send, nftCollectionApi, data)
	}
	if (isERC1155Request(data)) {
		if (data.lazy) {
			return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		}
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

export function isERC721Request(data: MintRequest): data is ERC721Request {
	return data.type === NftCollectionTypeEnum.ERC721 && isLazy(data)
}

export function isLegacyERC721Request(data: MintRequest): data is LegacyERC721Request {
	return data.type === NftCollectionTypeEnum.ERC721 && !isLazy(data)
}

export function isERC1155Request(data: MintRequest): data is ERC1155Request {
	return data.type === NftCollectionTypeEnum.ERC1155 && isLazy(data)
}

export function isLegacyERC1155Request(data: MintRequest): data is LegacyERC1155Request {
	return data.type === NftCollectionTypeEnum.ERC1155 && !isLazy(data)
}

function isLazy(data: MintRequest): data is ERC721Request | ERC1155Request {
	const supportsMintAndTransfer = (data.collection.features || []).indexOf("MINT_AND_TRANSFER") !== -1
	return Boolean(data.collection.supportsLazyMint || supportsMintAndTransfer)
}