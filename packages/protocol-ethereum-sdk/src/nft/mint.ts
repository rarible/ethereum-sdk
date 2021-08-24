import {
	Address,
	Binary,
	LazyErc1155,
	NftCollection,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
	Part,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { SimpleLazyNft } from "./sign-nft"
import { mintOnChain } from "./mint-on-chain"
import { mintOffChain } from "./mint-off-chain"
import { LazyErc721 } from "@rarible/protocol-api-client/build/models/LazyNft"
import { toBigNumber } from "@rarible/types/build/big-number"

type SimpleNft721Legacy = {
	"@type": "ERC721"
}

type SimpleNft1155Legacy = {
	"@type": "ERC1155"
	amount: string
}

export type SimpleNft721 = {
	"@type": "ERC721"
	creators: Part[]
}

export type SimpleNft1155 = {
	"@type": "ERC1155"
	creators: Part[]
	amount: string
}
type SimpleNft = SimpleNft721 | SimpleNft1155 | SimpleNft721Legacy | SimpleNft1155Legacy

export type MintLazyRequest = SimpleLazyNft<"signatures" | "tokenId"> & { isLazy: true }

export type MintOnchainRequest =
	SimpleNft
	& { contract: Address, uri: string, royalties: Part[], isLazy?: false }

export type MintRequest = MintLazyRequest | MintOnchainRequest

export async function mint(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintRequest,
): Promise<string> {
	if (data.isLazy) {
		return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
	} else {
		return await mintOnChain(ethereum, signNft, nftCollectionApi, data)
	}
}

type ERC721Collection = Pick<NftCollection, "id" | "features"> & { type: "ERC721" }
type LegacyERC721Collection = ERC721Collection & { [lazySupported]: false }
type LazyERC721Collection = ERC721Collection & { [lazySupported]: true }

function isLazy721Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LazyERC721Collection {
	return collection.type === "ERC721" && collection.features.indexOf("MINT_WITH_ADDRESS") !== -1
}

function isLegacyErc721Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LegacyERC721Collection {
	return collection.type === "ERC721" && collection.features.indexOf("MINT_WITH_ADDRESS") === -1
}

type LegacyERC721Request = {
	collection: LegacyERC721Collection
	uri: string
	royalties: Array<Part>
}

type LazyErc721Request = {
	collection: LazyERC721Collection,
	lazy?: boolean
} & Omit<LazyErc721, "signatures" | "contract" | "tokenId" | "@type">

type ERC1155Collection = Pick<NftCollection, "id" | "features"> & { type: "ERC1155" }
type LegacyERC1155Collection = ERC1155Collection & { [lazySupported]: false }
type LazyERC1155Collection = ERC1155Collection & { [lazySupported]: true }

function isLazy1155Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LazyERC1155Collection {
	return collection.type === "ERC1155" && collection.features.indexOf("MINT_WITH_ADDRESS") !== -1
}

function isLegacyErc1155Collection(
	collection: Pick<NftCollection, "id" | "type" | "features">,
): collection is LegacyERC1155Collection {
	return collection.type === "ERC1155" && collection.features.indexOf("MINT_WITH_ADDRESS") === -1
}

type LegacyERC1155Request = {
	collection: LegacyERC1155Collection
	uri: string
	supply: number
	royalties: Array<Part>
}

type LazyErc1155Request = {
	collection: LazyERC1155Collection,
	lazy?: boolean
} & Omit<LazyErc1155, "signatures" | "contract" | "tokenId" | "@type">

function showHowToMint(collection: NftCollection) {
	if (isLazy721Collection(collection)) {
		newMint({
			collection,
			uri: "uri",
			royalties: [],
			creators: []
		})
	} else if (isLegacyErc721Collection(collection)) {
		newMint({
			collection,
			uri: "",
			royalties: []
		})
	} else if (isLazy1155Collection(collection)) {
		newMint({
			collection,
			uri: "",
			royalties: [],
			supply: toBigNumber("1"),
			creators: []
		})
	} else if (isLegacyErc1155Collection(collection)) {
		newMint({
			collection,
			uri: "",
			royalties: [],
			supply: 1
		})
	}
}

declare const lazySupported: unique symbol

type NewMintRequest = LazyErc721Request | LegacyERC721Request | LazyErc1155Request | LegacyERC1155Request

function newMint(request: NewMintRequest) {

}


