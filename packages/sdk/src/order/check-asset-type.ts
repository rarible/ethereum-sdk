import { toBigNumber } from "@rarible/types"
import type {
	Address,
	CryptoPunksAssetType,
	Erc1155AssetType,
	Erc721AssetType,
	NftCollectionControllerApi,
} from "@rarible/ethereum-api-client"

export type NftAssetType = {
	contract: Address
	tokenId: string | number
}

export type AssetTypeRequest = Erc721AssetType | Erc1155AssetType | NftAssetType | CryptoPunksAssetType
export type AssetTypeResponse = Erc721AssetType | Erc1155AssetType | CryptoPunksAssetType
export type CheckAssetTypeFunction = (asset: AssetTypeRequest) => Promise<AssetTypeResponse>

export async function checkAssetType(
	collectionApi: NftCollectionControllerApi, asset: AssetTypeRequest
): Promise<AssetTypeResponse> {
	if ("assetClass" in asset) {
		return asset
	} else {
		const collectionResponse = await collectionApi.getNftCollectionByIdRaw({ collection: asset.contract })
		if (collectionResponse.status === 200) {
			switch (collectionResponse.value.type) {
				case "ERC721":
				case "ERC1155": {
					return {
						...asset,
						tokenId: toBigNumber(`${asset.tokenId}`),
						assetClass: collectionResponse.value.type,
					}
				}
				case "CRYPTO_PUNKS": {
					return {
						assetClass: "CRYPTO_PUNKS",
						contract: asset.contract,
						tokenId: parseInt(`${asset.tokenId}`),
					}
				}
				default: {
					throw new Error(`Unrecognized collection asset class ${collectionResponse.value.type}`)
				}
			}
		} else {
			throw new Error(`Can't get info of NFT collection with id ${asset.contract}`)
		}
	}
}
