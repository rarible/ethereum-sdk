import { Address, Asset, OrderForm } from "@rarible/ethereum-api-client"

export type CheckLazyOrderPart = Pick<OrderForm, "make" | "take" | "maker">

export async function checkLazyOrder<T extends CheckLazyOrderPart>(
	checkLazyAsset: (asset: Asset) => Promise<Asset>,
	form: T,
): Promise<T> {
	const make = await checkLazyMakeAsset(checkLazyAsset, form.make, form.maker)
	const take = await checkLazyAsset(form.take)
	return {
		...form,
		make,
		take,
	}
}

async function checkLazyMakeAsset(
	checkLazyAsset: (asset: Asset) => Promise<Asset>,
	asset: Asset,
	maker: Address
): Promise<Asset> {
	const make = await checkLazyAsset(asset)
	if (
		(make.assetType.assetClass === "ERC1155_LAZY" || make.assetType.assetClass === "ERC721_LAZY") &&
		make.assetType.creators[0].account === maker
	) {
		return make
	} else {
		return asset
	}
}
