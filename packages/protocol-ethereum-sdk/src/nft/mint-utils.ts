/* eslint-disable camelcase */
import type { Address, NftCollection_Features } from "@rarible/protocol-api-client"
import { LegacyERC721Collection, ERC721Collection, LegacyERC1155Collection, ERC1155Collection, NftCollectionTypeEnum, LegacyERC721Request, ERC721Request, LegacyERC1155Request, ERC1155Request } from "./mint"

export function createErc721LegacyCollection(
	token: Address, features?: NftCollection_Features[]
): LegacyERC721Collection {
	return {
		type: NftCollectionTypeEnum.ERC721_LEGACY,
		id: token,
		features,
	}
}

export function createErc721LegacyMintRequest(
	props: Omit<LegacyERC721Request, "type" | "collection">, token: Address, features?: NftCollection_Features[],
): LegacyERC721Request {
	return {
		type: NftCollectionTypeEnum.ERC721_LEGACY,
		collection: createErc721LegacyCollection(token, features),
		...props,
	}
}

export function createErc721Collection(id: Address, features?: NftCollection_Features[]): ERC721Collection {
	return {
		type: NftCollectionTypeEnum.ERC721,
		id,
		features,
	}
}

export function createErc721MintRequest(
	props: Omit<ERC721Request, "type" | "collection">, token: Address, features?: NftCollection_Features[],
): ERC721Request {
	return {
		type: NftCollectionTypeEnum.ERC721,
		collection: createErc721Collection(token, features),
		...props,
	}
}

export function createErc1155LegacyCollection(
	id: Address, features?: NftCollection_Features[]
): LegacyERC1155Collection {
	return {
		type: NftCollectionTypeEnum.ERC1155_LEGACY,
		id,
		features,
	}
}

export function createErc1155LegacyMintRequest(
	props: Omit<LegacyERC1155Request, "type" | "collection">, token: Address, features?: NftCollection_Features[],
): LegacyERC1155Request {
	return {
		type: NftCollectionTypeEnum.ERC1155_LEGACY,
		collection: createErc1155LegacyCollection(token, features),
		...props,
	}
}

export function createErc1155Collection(id: Address, features?: NftCollection_Features[]): ERC1155Collection {
	return {
		type: NftCollectionTypeEnum.ERC1155,
		id,
		features,
	}
}

export function createErc1155MintRequest(
	props: Omit<ERC1155Request, "type" | "collection">, token: Address, features?: NftCollection_Features[],
): ERC1155Request {
	return {
		type: NftCollectionTypeEnum.ERC1155,
		collection: createErc1155Collection(token, features),
		...props,
	}
}