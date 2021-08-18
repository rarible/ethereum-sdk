import { Address, Binary, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { SimpleLazyNft } from "./sign-nft"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"

type SimpleNft721 = {
	"@type": "ERC721"
}

type SimpleNft1155 = {
	"@type": "ERC1155"
	amount: number
}

type SimpleNft = SimpleNft721 | SimpleNft1155

export type MintLazyRequest = SimpleLazyNft<"signatures" | "tokenId"> & { isLazy: true }

export type MintRequest = SimpleNft & { contract: Address, uri: string, isLazy?: false }

type MintDataType = MintLazyRequest | MintRequest

export async function mint(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintDataType,
): Promise<string> {
	if (data.isLazy) {
		return await mintOffChain(signNft, nftCollectionApi, nftLazyMintApi, data)
	} else {
		return await mintOnChain(ethereum, nftCollectionApi, data)
	}
}

export async function mintOnChain(ethereum: Ethereum, nftCollectionApi: NftCollectionControllerApi, data: MintRequest): Promise<string> {
	switch (data["@type"]) {
		case "ERC721": {
			const erc721Contract = createMintableTokenContract(ethereum, data.contract)
			const { tokenId, signature: { v, r, s } } = await nftCollectionApi.generateNftTokenId({
				collection: data.contract,
				minter: await ethereum.getFrom(),
			})
			await erc721Contract.functionCall("mint", tokenId, v, r, s, [], data.uri).send()
			return tokenId
		}
		case "ERC1155": {
			const erc155Contract = createRaribleTokenContract(ethereum, data.contract)
			const { tokenId, signature: { v, r, s } } = await nftCollectionApi.generateNftTokenId({
				collection: data.contract,
				minter: await ethereum.getFrom(),
			})
			await erc155Contract.functionCall("mint", tokenId, v, r, s, [], data.amount, data.uri).send()
			return tokenId
		}
	}
}

export async function mintOffChain(
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	nftLazyMintApi: NftLazyMintControllerApi,
	data: MintLazyRequest,
): Promise<string> {
	const { features } = await nftCollectionApi.getNftCollectionById({ collection: data.contract })

	if (features.includes("MINT_AND_TRANSFER")) {
		const { tokenId } = await nftCollectionApi.generateNftTokenId({
			collection: data.contract,
			minter: data.creators[0].account,
		})
		const signature = await signNft({ tokenId, ...data })
		const nftLazyItem = await nftLazyMintApi.mintNftAsset({
			lazyNft: {
				...data,
				tokenId,
				signatures: [signature],
			},
		})
		return nftLazyItem.id
	} else {
		throw new Error("This collection doesn't support lazy minting")
	}
}

