import {BigNumber} from "@rarible/types";
import {
    Address,
    Erc1155AssetType, Erc721AssetType,
    NftCollectionControllerApi,
    NftItemControllerApi
} from "@rarible/protocol-api-client";

export type NftAssetType = {
    contract: Address;
    tokenId: BigNumber;
}

export type AssetTypeRequest = Erc721AssetType | Erc1155AssetType | NftAssetType

export type AssetTypeResponse = Erc721AssetType | Erc1155AssetType

export type CheckAssetTypeFunction = (asset: AssetTypeRequest) => Promise<AssetTypeResponse>

export async function checkAssetType(nftItemApi: NftItemControllerApi, collectionApi: NftCollectionControllerApi, asset: AssetTypeRequest): Promise<AssetTypeResponse> {
    if ('assetClass' in asset) {
        return asset
    } else {
        const collectionResponse = await collectionApi.getNftCollectionByIdRaw({collection: asset.contract})
        if (collectionResponse.status === 200) {
            return {
                ...asset,
                assetClass: collectionResponse.value.type,
            }
        } else {
            throw new Error(`Can't get info of NFT collection with id ${asset.contract}`)
        }
    }
}
