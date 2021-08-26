import { Asset, AssetType } from "@rarible/protocol-api-client"

export async function checkLazyAsset(
	checkLazyAssetType: (assetType: AssetType) => Promise<AssetType>,
	asset: Asset
): Promise<Asset> {
	return {
		assetType: await checkLazyAssetType(asset.assetType),
		value: asset.value,
	}
}
