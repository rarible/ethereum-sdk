import type { Address, Binary, NftCollectionControllerApi, NftLazyMintControllerApi, Part, NftItem, NftCollection, BigNumber } from "@rarible/protocol-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { SendFunction } from "../common/send-transaction"
import { mintOffChain } from "./mint-off-chain"
import { mintErc1155v1, mintErc1155v2, mintErc721v1, mintErc721v2, mintErc721v3 } from "./mint-on-chain"
import type { SimpleLazyNft } from "./sign-nft"
import { ERC1155VersionEnum, ERC721VersionEnum, NFTContractVersion } from "./contracts/domain"

type Collection<V extends NFTContractVersion> = {
	version: V
	id: NftCollection["id"]
	features?: NftCollection["features"]
}

export type AnyNFTCollection = Collection<NFTContractVersion>
export type ERC721CollectionV1 = Collection<ERC721VersionEnum.ERC721V1>
export type ERC721CollectionV2 = Collection<ERC721VersionEnum.ERC721V2>
export type ERC721CollectionV3 = Collection<ERC721VersionEnum.ERC721V3>
export type ERC721Collection = ERC721CollectionV1 | ERC721CollectionV2 | ERC721CollectionV3
export type ERC1155CollectionV1 = Collection<ERC1155VersionEnum.ERC1155V1>
export type ERC1155CollectionV2 = Collection<ERC1155VersionEnum.ERC1155V2>
export type ERC1155Collection = ERC1155CollectionV1 | ERC1155CollectionV2

export type ERC721RequestV1 = {
	collection: ERC721CollectionV1
	uri: string
}

export type ERC721RequestV2 = {
	collection: ERC721CollectionV2
	uri: string
	royalties: Array<Part>
}

export type ERC721RequestV3 = {
	collection: ERC721CollectionV3
	lazy: boolean
	uri: string;
	creators: Array<Part>
	royalties: Array<Part>
}

export type ERC1155RequestV1 = {
	collection: ERC1155CollectionV1
	uri: string
	supply: number
	royalties: Array<Part>
}

export type ERC1155RequestV2 = {
	collection: ERC1155CollectionV2
	uri: string
	supply: number
	lazy: boolean
	creators: Array<Part>
	royalties: Array<Part>
}

export type MintRequestERC721 = ERC721RequestV1 | ERC721RequestV2 | ERC721RequestV3
export type MintRequestERC1155 = ERC1155RequestV1 | ERC1155RequestV2
export type MintRequest = MintRequestERC721 | MintRequestERC1155

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
	if (isERC721v3Request(data)) {
		if (data.lazy) return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		return mintErc721v3(ethereum, send, nftCollectionApi, data)
	}
	if (isERC721v2Request(data)) {
		return mintErc721v2(ethereum, send, nftCollectionApi, data)
	}
	if (isERC1155v2Request(data)) {
		if (data.lazy) return mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
		return mintErc1155v2(ethereum, send, nftCollectionApi, data)
	}
	if (isERC1155v1Request(data)) {
		return mintErc1155v1(ethereum, send, nftCollectionApi, data)
	}
	if (isERC721v1Request(data)) {
		return mintErc721v1(ethereum, send, nftCollectionApi, data)
	}
	throw new Error("Unsupported collection type")
}

const isERC721v1Request = (data: MintRequest): data is ERC721RequestV1 => isErc721v1Collection(data.collection)
const isERC721v2Request = (data: MintRequest): data is ERC721RequestV2 => isErc721v2Collection(data.collection)
const isERC721v3Request = (data: MintRequest): data is ERC721RequestV3 => isErc721v3Collection(data.collection)
const isERC1155v1Request = (data: MintRequest): data is ERC1155RequestV1 => isErc1155v1Collection(data.collection)
const isERC1155v2Request = (data: MintRequest): data is ERC1155RequestV2 => isErc1155v2Collection(data.collection)

export const isErc721v1Collection = (x: AnyNFTCollection): x is ERC721CollectionV1 =>
	x.version === ERC721VersionEnum.ERC721V1
export const isErc721v2Collection = (x: AnyNFTCollection): x is ERC721CollectionV2 =>
	x.version === ERC721VersionEnum.ERC721V2
export const isErc721v3Collection = (x: AnyNFTCollection): x is ERC721CollectionV3 =>
	x.version === ERC721VersionEnum.ERC721V3
export const isErc1155v1Collection = (x: AnyNFTCollection): x is ERC1155CollectionV1 =>
	x.version === ERC1155VersionEnum.ERC1155V1
export const isErc1155v2Collection = (x: AnyNFTCollection): x is ERC1155CollectionV2 =>
	x.version === ERC1155VersionEnum.ERC1155V2

export type NftCollectionLike = Pick<NftCollection, "type" | "id"> & {
	features?: NftCollection["features"]
	supportsLazyMint?: boolean
}

export function prepareMintCollection(collection: NftCollectionLike): AnyNFTCollection {
	const features = collection.features || []
	if (collection.type === "ERC1155") {
		if (features.indexOf("MINT_AND_TRANSFER") !== -1 || collection.supportsLazyMint) {
			return {
				version: ERC1155VersionEnum.ERC1155V2,
				...collection,
			}
		}
		return {
			version: ERC1155VersionEnum.ERC1155V1,
			...collection,
		}
	}
	if (collection.type === "ERC721") {
		if (features.indexOf("MINT_AND_TRANSFER") !== -1 || collection.supportsLazyMint) {
			return {
				version: ERC721VersionEnum.ERC721V3,
				...collection,
			}
		}
		if (features.indexOf("SECONDARY_SALE_FEES") !== -1) {
			return {
				version: ERC721VersionEnum.ERC721V2,
				...collection,
			}
		}
		return {
			version: ERC721VersionEnum.ERC721V1,
			...collection,
		}
	}
	throw new Error("Unsupported collection type")
}
