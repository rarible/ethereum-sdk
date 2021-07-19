import { Address, Asset, OrderForm } from "@rarible/protocol-api-client"

export async function checkLazyOrder(checkLazyAsset: (asset: Asset) => Promise<Asset>, form: OrderForm): Promise<OrderForm> {
	const make = await checkLazyMakeAsset(checkLazyAsset, form.make, form.maker)
	const take = await checkLazyAsset(form.take)
	return {
		...form,
		make,
		take,
	}
}

async function checkLazyMakeAsset(
	checkLazyAsset: (asset: Asset) => Promise<Asset>, asset: Asset, maker: Address,
): Promise<Asset> {
	const make = await checkLazyAsset(asset)
	if ((make.assetType.assetClass === "ERC1155_LAZY" || make.assetType.assetClass === "ERC721_LAZY") && make.assetType.creators[0].account === maker) {
		return make
	} else {
		return asset
	}
}
