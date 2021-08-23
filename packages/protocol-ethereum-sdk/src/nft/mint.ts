import {
	Address,
	Binary,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
	Part,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { SimpleLazyNft } from "./sign-nft"
import { mintOnChain } from "./mint-on-chain"
import { mintOffChain } from "./mint-off-chain"

type SimpleNft721 = {
	"@type": "ERC721"
}

type SimpleNft1155 = {
	"@type": "ERC1155"
	amount: string
}

type SimpleNft = SimpleNft721 | SimpleNft1155

export type MintLazyRequest = SimpleLazyNft<"signatures" | "tokenId"> & { isLazy: true }

export type MintOnchainRequest =
	SimpleNft
	& { contract: Address, uri: string, creators?: Part[], royalties?: Part[], isLazy?: false }

type MintRequest = MintLazyRequest | MintOnchainRequest

export async function mint(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintRequest,
): Promise<string> {
	if (data.isLazy) {
		return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
	} else {
		return await mintOnChain(ethereum, signNft, nftCollectionApi, data)
	}
}



