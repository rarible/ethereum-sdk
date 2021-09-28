import { toLegacyAssetType } from "./to-legacy-asset-type"
import { SimpleLegacyOrder } from "./sign-order"

export function toStructLegacyOrder(order: SimpleLegacyOrder) {
	if (order.type !== "RARIBLE_V1") {
		throw new Error(`Not supported type: ${order.type}`)
	}
	const data = order.data
	if (data.dataType !== "LEGACY") {
		throw new Error(`Not supported data type: ${data.dataType}`)
	}
	return {
		key: toStructLegacyOrderKey(order),
		selling: order.make.value,
		buying: order.take.value,
		sellerFee: data.fee,
	}
}

export function toStructLegacyOrderKey(order: SimpleLegacyOrder) {
	return {
		owner: order.maker,
		salt: order.salt,
		sellAsset: toLegacyAssetType(order.make.assetType),
		buyAsset: toLegacyAssetType(order.take.assetType),
	}
}
