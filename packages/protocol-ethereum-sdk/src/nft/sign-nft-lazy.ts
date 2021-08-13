import { Binary, EIP712Domain, LazyErc1155 } from "@rarible/protocol-api-client"
import { Address, toBinary } from "@rarible/types"
import { signTypedData } from "@rarible/ethereum-provider"
import { LazyErc721 } from "@rarible/protocol-api-client/build/models/LazyNft"
import { Ethereum } from "@rarible/ethereum-provider/build"
import { EIP721_DOMAIN_NFT_TEMPLATE, EIP721_NFT_TYPE, EIP721_NFT_TYPES } from "./eip712-lazy"

export type SimpleLazyNft<K extends keyof any> = Omit<LazyErc721, K> | Omit<LazyErc1155, K>

export async function signNftLazy(
	ethereum: Ethereum,
	chainId: number,
	nft: SimpleLazyNft<"signatures" | "@type">,
): Promise<Binary> {
	// @ts-ignore
	const domain = createEIP712NftDomain(chainId, nft.contract, nft['@type'])

	const data = {
		types: EIP721_NFT_TYPES,
		domain,
		primaryType: EIP721_NFT_TYPE,
		message: {
			royalties: nft.royalties,
			creators: nft.creators,
			uri: nft.uri,
			tokenId: nft.tokenId,
		},
	}
	return toBinary(await signTypedData(ethereum, data))
}


function createEIP712NftDomain(chainId: number, verifyingContract: Address): EIP712Domain {
	return {
		...EIP721_DOMAIN_NFT_TEMPLATE,
		chainId,
		verifyingContract: verifyingContract,
	}
}


