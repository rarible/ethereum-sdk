import { AssetType } from "@rarible/protocol-api-client"
import { NftAssetType } from "./check-asset-type"

export function isNft(type: AssetType) {
	return extractNftType(type) !== undefined
}

export function extractNftType(type: AssetType): NftAssetType | undefined {
	switch (type.assetClass) {
		case "ERC721": return type
		case "ERC1155": return type
		case "ERC721_LAZY": return type
		case "ERC1155_LAZY": return type
		default: return undefined
	}
}
