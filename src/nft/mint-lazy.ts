import Web3 from "web3";
import {
    Address, Binary, Erc1155AssetType,
    Erc721AssetType,
    NftCollectionControllerApi,
    NftLazyMintControllerApi
} from "@rarible/protocol-api-client";
import {BigNumber, toAddress} from "@rarible/types";
import {toBigNumber} from "@rarible/types/build/big-number";

type MintLazyRequest = {
    assetType: Pick<Erc721AssetType, 'assetClass'> | Pick<Erc1155AssetType, 'assetClass'>
    minter: Address,
    royalties: [],
    creators: [],
    supply?: BigNumber
}

export async function mintLazy(
    web3: Web3,
    signTypedData: (signer: string, data: any) => Promise<Binary>,
    nftCollection: NftCollectionControllerApi,
    nftLazyMintApi: NftLazyMintControllerApi,
    mintLazyRequest: MintLazyRequest
    ): Promise<any> {

    // todo get contract address based on assetType for Rarible collection or create new collection
    const contract = '0x0'
    const {tokenId} = await nftCollection.generateNftTokenId({collection: contract, minter: mintLazyRequest.minter})
    // todo request ipfs link
    const ipfsUri = "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp"
    switch (mintLazyRequest.assetType.assetClass) {
        case "ERC721": {
            const data = {
                "@type": mintLazyRequest.assetType.assetClass,
                contract,
                tokenId,
                uri: ipfsUri,
                creators: mintLazyRequest.creators,
                royalties: mintLazyRequest.royalties,
            }
            const signature = await signTypedData(mintLazyRequest.minter, data)
            return await nftLazyMintApi.mintNftAsset({
                lazyNft: {
                    "@type": "ERC721",
                    contract: toAddress(contract),
                    tokenId: tokenId,
                    uri: ipfsUri,
                    creators: mintLazyRequest.creators,
                    royalties: mintLazyRequest.royalties,
                    signatures: [signature],
                }
            })
        }
        case "ERC1155": {
            const data = {
                "@type": mintLazyRequest.assetType.assetClass,
                contract,
                tokenId,
                uri: ipfsUri,
                creators: mintLazyRequest.creators,
                royalties: mintLazyRequest.royalties,
                supply: mintLazyRequest.supply,
            }
            const signature = await signTypedData(mintLazyRequest.minter, data)
            if (mintLazyRequest.supply) {
                return await nftLazyMintApi.mintNftAsset({
                    lazyNft: {
                        "@type": "ERC1155",
                        contract: toAddress(contract),
                        tokenId: tokenId,
                        uri: ipfsUri,
                        creators: mintLazyRequest.creators,
                        royalties: mintLazyRequest.royalties,
                        signatures: [signature],
                        supply: toBigNumber(mintLazyRequest.supply)
                    }
                })
            } else {
                return Promise.reject("Error: property 'supply: BidNumber' for ERC1155 is required")
            }
        }
    }
}
