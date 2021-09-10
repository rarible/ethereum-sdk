import { Binary, EIP712Domain, LazyErc1155 } from "@rarible/protocol-api-client"
import { Address, toBinary } from "@rarible/types"
import { signTypedData } from "@rarible/ethereum-provider"
import { LazyErc721 } from "@rarible/protocol-api-client/build/models/LazyNft"
import { Ethereum } from "@rarible/ethereum-provider"
import {
	EIP1155_DOMAIN_NFT_TEMPLATE,
	EIP1155_NFT_TYPE,
	EIP1155_NFT_TYPES,
	EIP721_DOMAIN_NFT_TEMPLATE,
	EIP721_NFT_TYPE,
	EIP721_NFT_TYPES
} from "./eip712"

export type SimpleLazyNft<K extends keyof any> = Omit<LazyErc721, K> | Omit<LazyErc1155, K>

export async function signNft(ethereum: Ethereum, chainId: number, nft: SimpleLazyNft<"signatures">): Promise<Binary> {
	switch (nft["@type"]) {
		case "ERC721": {
			const domain = createEIP712NftDomain(chainId, nft.contract, "ERC721")

			const data = {
				types: EIP721_NFT_TYPES,
				domain,
				primaryType: EIP721_NFT_TYPE,
				message: { ...nft, tokenURI: nft.uri },
			}
			return toBinary(await signTypedData(ethereum, data))
		}
		case "ERC1155": {
			const domain = createEIP712NftDomain(chainId, nft.contract, "ERC1155")

			const data = {
				types: EIP1155_NFT_TYPES,
				domain,
				primaryType: EIP1155_NFT_TYPE,
				message: { ...nft, tokenURI: nft.uri },
			}
			return toBinary(await signTypedData(ethereum, data))
		}
		default: {
			throw new Error("Unexpected")
		}
	}
}

function createEIP712NftDomain(
	chainId: number,
	verifyingContract: Address,
	nftType: "ERC721" | "ERC1155"
): EIP712Domain {
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
		default: {
			throw new Error("Unexpected")
		}
	}
}
