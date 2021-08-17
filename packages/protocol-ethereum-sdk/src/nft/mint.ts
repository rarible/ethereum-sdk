import {
	Address,
	Binary,
	NftCollectionControllerApi,
	NftItem,
	NftLazyMintControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { SimpleLazyNft } from "./sign-nft"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"

type SimpleNft721 = {
	"@type": "ERC721"
	uri: string
}

type SimpleNft1155 = {
	"@type": "ERC1155"
	amount: number
	uri: string
}

type SimpleNft = SimpleNft721 | SimpleNft1155

export type MintLazyRequest = SimpleLazyNft<"signatures" | "tokenId"> & { isLazy: true }

export type MintRequest = SimpleNft & { isLazy: false, contract: Address, minter: Address }

type MintDataType = MintLazyRequest | MintRequest

export async function mint(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintDataType,
): Promise<NftItem | string | undefined> {
	if (data.isLazy) {
		return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
	} else {
		return await mintOnChain(ethereum, nftCollectionApi, data)
	}
}

export async function mintOnChain(ethereum: Ethereum, nftCollectionApi: NftCollectionControllerApi, data: MintRequest) {
	switch (data["@type"]) {
		case "ERC721": {
			const erc721Contract = createMintableTokenContract(ethereum, data.contract)
			const { tokenId, signature: { v, r, s } } = await nftCollectionApi.generateNftTokenId({
				collection: data.contract,
				minter: data.minter,
			})
			const tx = await erc721Contract.functionCall("mint", tokenId, v, r, s, [], data.uri).send()
			return tx.hash ? tokenId : undefined
		}
		case "ERC1155": {
			const erc155Contract = createRaribleTokenContract(ethereum, data.contract)
			const { tokenId, signature: { v, r, s } } = await nftCollectionApi.generateNftTokenId({
				collection: data.contract,
				minter: data.minter,
			})
			const tx = await erc155Contract.functionCall("mint", tokenId, v, r, s, [], data.amount, data.uri).send()
			return tx.hash ? tokenId : undefined
		}
	}
}

export async function mintOffChain(
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintLazyRequest,
) {
	const { features } = await nftCollectionApi.getNftCollectionById({ collection: data.contract })

	if (features.includes("MINT_AND_TRANSFER")) {
		const { tokenId } = await nftCollectionApi.generateNftTokenId({
			collection: data.contract,
			minter: data.creators[0].account,
		})
		const signature = await signNft({ tokenId, ...data })
		return await nftLazyMintApi.mintNftAsset({
			lazyNft: {
				...data,
				tokenId,
				signatures: [signature],
			},
		})
	} else {
		throw new Error("This collection doesn't support lazy minting")
	}
	return undefined
}

