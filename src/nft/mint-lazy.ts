import Web3 from "web3";
import {
    Binary,
    NftCollectionControllerApi, NftItem,
    NftLazyMintControllerApi, Part
} from "@rarible/protocol-api-client";
import {SignNftRequestType} from "./sign-nft";
import {Address, BigNumber} from "@rarible/types";

export type MintLazyStageId = "mint-lazy"

export type LazyErc721Request = {
    "@type": "ERC721";
    contract: Address;
    uri: string;
    creators: Array<Part>;
    royalties: Array<Part>;
}

export type LazyErc1155Request = {
    "@type": "ERC1155";
    contract: Address;
    uri: string;
    creators: Array<Part>;
    royalties: Array<Part>;
    supply: BigNumber;
}

export type MintLazyRequest = LazyErc721Request | LazyErc1155Request

export async function mintLazy(
    web3: Web3,
    signNft: (nft: SignNftRequestType) => Promise<Binary>,
    nftCollection: NftCollectionControllerApi,
    nftLazyMintApi: NftLazyMintControllerApi,
    mintLazyRequest: MintLazyRequest
    ): Promise<NftItem> {

    const {tokenId} = await nftCollection.generateNftTokenId({
        collection: mintLazyRequest.contract,
        minter: mintLazyRequest.creators[0].account}
    )

    switch (mintLazyRequest['@type']) {
        case "ERC721": {
            const signature = await signNft({
                tokenId,
                ...mintLazyRequest,
            })

            return await nftLazyMintApi.mintNftAsset({
                lazyNft: {
                    ...mintLazyRequest,
                    tokenId,
                    signatures: [signature],
                }
            })
        }
        case "ERC1155": {
            const signature = await signNft({
                ...mintLazyRequest,
                tokenId,
            })
            if (mintLazyRequest.supply) {
                return await nftLazyMintApi.mintNftAsset({
                    lazyNft: {
                        ...mintLazyRequest,
                        tokenId,
                        signatures: [signature]
                    }
                })
            } else {
                return Promise.reject("Error: property 'supply: BigNumber' for ERC1155 is required")
            }
        }
    }
}


