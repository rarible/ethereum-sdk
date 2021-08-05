import Web3 from "web3";
import {
    Address,
    Erc1155AssetType,
    Erc721AssetType,
    NftCollectionControllerApi, NftItem,
    NftLazyMintControllerApi
} from "@rarible/protocol-api-client";
import {BigNumber, toAddress} from "@rarible/types";
import {toBigNumber} from "@rarible/types/build/big-number";
import {signTypedData} from "../common/sign-typed-data";

export type MintLazyStageId = "mint-lazy"

export type MintLazyRequest = {
    assetType: Pick<Erc721AssetType, 'assetClass' | 'contract'> | Pick<Erc1155AssetType, 'assetClass' | 'contract'>
    minter: Address
    uri: string,
    royalties: []
    creators: []
    supply?: BigNumber
}

export async function mintLazy(
    web3: Web3,
    nftCollection: NftCollectionControllerApi,
    nftLazyMintApi: NftLazyMintControllerApi,
    mintLazyRequest: MintLazyRequest
    ): Promise<NftItem> {

    const {tokenId} = await nftCollection.generateNftTokenId({collection: mintLazyRequest.assetType.contract, minter: mintLazyRequest.minter})
    switch (mintLazyRequest.assetType.assetClass) {
        case "ERC721": {
            const data = {
                "@type": mintLazyRequest.assetType.assetClass,
                contract: mintLazyRequest.assetType.contract,
                tokenId,
                uri: mintLazyRequest.uri,
                creators: mintLazyRequest.creators,
                royalties: mintLazyRequest.royalties,
            }
            const signature = await signTypedData(web3, mintLazyRequest.minter, data)
            return await nftLazyMintApi.mintNftAsset({
                lazyNft: {
                    "@type": "ERC721",
                    contract: toAddress(mintLazyRequest.assetType.contract),
                    tokenId: tokenId,
                    uri: mintLazyRequest.uri,
                    creators: mintLazyRequest.creators,
                    royalties: mintLazyRequest.royalties,
                    signatures: [signature],
                }
            })
        }
        case "ERC1155": {
            const data = {
                "@type": mintLazyRequest.assetType.assetClass,
                contract: mintLazyRequest.assetType.contract,
                tokenId,
                uri: mintLazyRequest.uri,
                creators: mintLazyRequest.creators,
                royalties: mintLazyRequest.royalties,
                supply: mintLazyRequest.supply,
            }
            const signature = await signTypedData(web3, mintLazyRequest.minter, data)
            if (mintLazyRequest.supply) {
                return await nftLazyMintApi.mintNftAsset({
                    lazyNft: {
                        "@type": "ERC1155",
                        contract: toAddress(mintLazyRequest.assetType.contract),
                        tokenId: tokenId,
                        uri: mintLazyRequest.uri,
                        creators: mintLazyRequest.creators,
                        royalties: mintLazyRequest.royalties,
                        supply: toBigNumber(mintLazyRequest.supply),
                        signatures: [signature],
                    }
                })
            } else {
                return Promise.reject("Error: property 'supply: BigNumber' for ERC1155 is required")
            }
        }
    }
}
