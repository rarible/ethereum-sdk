import Web3 from "web3";
import {
    Erc1155LazyAssetType,
    Erc721LazyAssetType,
    NftLazyMintControllerApi
} from "@rarible/protocol-api-client";

type MintLazyRequest = {
    assetType: Pick<Erc721LazyAssetType, 'assetClass' | 'royalties' | 'creators'> | Pick<Erc1155LazyAssetType, 'assetClass' | 'royalties' | 'creators'>
}

export async function mintLazy(
    web3: Web3,
    nftLazyMintController: NftLazyMintControllerApi,
    mintLazyRequest: MintLazyRequest
    ): Promise<any> {

    // get contract address based on assetType
    // request generate id
    // request ipfs link
    // sign typedData
    // request nftLazyMintController.mintNftAsset

    return ''
}
