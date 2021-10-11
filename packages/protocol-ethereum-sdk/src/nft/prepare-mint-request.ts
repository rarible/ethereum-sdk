import { Collection } from "@rarible/api-client"
import { Collection as APIClientCollection } from "@rarible/api-client/build/models/Collection"
import {
	isErc1155v2Collection,
	isErc721v2Collection,
	isErc721v3Collection,
} from "./mint"

export type PrepareMintResponse = {
	multiple: boolean
	supportsRoyalties: boolean
	supportsLazyMint: boolean
}

export function isSupportsRoyalties(collection: APIClientCollection): boolean {
	if (collection.type === "ERC721") {
		return isErc721v3Collection(collection) || isErc721v2Collection(collection)
	} else if (collection.type === "ERC1155") {
		return true
	} else {
		throw new Error("Unrecognized collection type")
	}
}

export function isSupportsLazyMint(collection: APIClientCollection) {
	return isErc721v3Collection(collection) || isErc1155v2Collection(collection)
}

export function isMultiple(collection: APIClientCollection): boolean {
	return collection.type === "ERC1155"
}

export function prepareMintRequest(collection: Collection): PrepareMintResponse {
	return {
		multiple: isMultiple(collection),
		supportsRoyalties: isSupportsRoyalties(collection),
		supportsLazyMint: isSupportsLazyMint(collection),
	}
}
