import {
	AssetType,
	Erc1155AssetType,
	Erc1155LazyAssetType,
	Erc721AssetType,
	Erc721LazyAssetType,
} from "@rarible/ethereum-api-client"

export function isNft(
	type: AssetType,
): type is (Erc721AssetType | Erc1155AssetType | Erc721LazyAssetType | Erc1155LazyAssetType) {
	switch (type.assetClass) {
		case "ERC721":
			return true
		case "ERC1155":
			return true
		case "ERC721_LAZY":
			return true
		case "ERC1155_LAZY":
			return true
		default:
			return false
	}
}
