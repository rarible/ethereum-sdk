import { AssetType, Erc20AssetType, EthAssetType } from "@rarible/protocol-api-client"

export function isCurrency(
	type: AssetType,
): type is (Erc20AssetType | EthAssetType) {
	switch (type.assetClass) {
		case "ERC20":
			return true
		case "ETH":
			return true
		default:
			return false
	}
}
