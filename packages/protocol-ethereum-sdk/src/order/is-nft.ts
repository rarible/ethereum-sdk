import { AssetType } from "@rarible/protocol-api-client"

export function isNft(assetType: AssetType) {
	return assetType.assetClass === "ERC1155"
		|| assetType.assetClass === "ERC721"
		|| assetType.assetClass === "ERC1155_LAZY"
		|| assetType.assetClass === "ERC721_LAZY"
}
