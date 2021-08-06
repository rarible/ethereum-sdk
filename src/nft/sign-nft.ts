import {
    Binary,
    EIP712Domain, Part,
} from "@rarible/protocol-api-client"
import Web3 from "web3"
import {Address, BigNumber} from "@rarible/types"
import {signTypedData} from "../common/sign-typed-data";
import {
    EIP1155_DOMAIN_NFT_TEMPLATE,
    EIP1155_NFT_TYPE,
    EIP1155_NFT_TYPES,
    EIP721_DOMAIN_NFT_TEMPLATE,
    EIP721_NFT_TYPE,
    EIP721_NFT_TYPES
} from "./eip712";

export type MintLazyErc721Simple = {
    "@type": "ERC721";
    contract: Address;
    uri: string;
    creators: Array<Part>;
    royalties: Array<Part>;
}
export type MintLazyErc1155Simple = {
    "@type": "ERC1155";
    contract: Address;
    uri: string;
    creators: Array<Part>;
    royalties: Array<Part>;
    supply: BigNumber;
}
type TokenData = {tokenId: BigNumber, creators: Part[]}
export type SignNftRequestType = MintLazyErc721Simple & TokenData | MintLazyErc1155Simple & TokenData

export async function signNft(
    web3: Web3,
    chainId: number,
    nft: SignNftRequestType,
): Promise<Binary> {
    switch (nft['@type']) {
        case "ERC721": {
            const domain = createEIP712NftDomain(chainId, nft.contract, "ERC721")

            const data = {
                types: EIP721_NFT_TYPES,
                domain,
                primaryType: EIP721_NFT_TYPE,
                message: {...nft, tokenURI: nft.uri}
            }
            return signTypedData(web3, nft.creators[0].account, data)
        }
        case "ERC1155":
            const domain = createEIP712NftDomain(chainId, nft.contract, "ERC1155")

            const data = {
                types: EIP1155_NFT_TYPES,
                domain,
                primaryType: EIP1155_NFT_TYPE,
                message: {...nft, tokenURI: nft.uri}
            }
            return signTypedData(web3, nft.creators[0].account, data)
    }
}


function createEIP712NftDomain(chainId: number, verifyingContract: Address, nftType: 'ERC721' | 'ERC1155'): EIP712Domain {
    switch (nftType) {
        case "ERC721": {
            return {
                ...EIP721_DOMAIN_NFT_TEMPLATE,
                chainId,
                verifyingContract: verifyingContract,
            }
        }
        case "ERC1155": {
            return {
                ...EIP1155_DOMAIN_NFT_TEMPLATE,
                chainId,
                verifyingContract: verifyingContract,
            }
        }
    }
}


