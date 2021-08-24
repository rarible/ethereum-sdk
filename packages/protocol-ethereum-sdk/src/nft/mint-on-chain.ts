import { Ethereum } from "@rarible/ethereum-provider"
import { Binary, NftCollectionControllerApi } from "@rarible/protocol-api-client"
import { toAddress } from "@rarible/types"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"
import { SimpleLazyNft } from "./sign-nft"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { LazyErc1155Request, LazyErc721Request, LegacyERC1155Request, LegacyERC721Request } from "./mint"
import { getTokenId } from "./get-token-id"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"

export async function mintErc721Legacy(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	data: LegacyERC721Request,
) {
	const from = toAddress(await ethereum.getFrom())
	const erc721Contract = createMintableTokenContract(ethereum, data.collection.id)
	const { tokenId, signature: { v, r, s } } = await getTokenId(nftCollectionApi, data.collection.id, from)
	await erc721Contract.functionCall("mint", tokenId, v, r, s, data.royalties, data.uri).send()
	return tokenId
}

export async function mintErc721New(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	data: LazyErc721Request,
) {
	const from = toAddress(await ethereum.getFrom())
	const erc721Contract = createErc721LazyContract(ethereum, data.collection.id)
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, from)
	const creators = data.creators || [{ account: from, value: 10000 }]

	const nftData: SimpleLazyNft<"signatures"> = {
		"@type": "ERC721",
		tokenId,
		creators,
		royalties: data.royalties || [],
		contract: data.collection.id,
		uri: data.uri,
	}
	const signature = await signNft(nftData)

	await erc721Contract.functionCall(
		"mintAndTransfer",
		{
			tokenId,
			creators,
			royalties: data.royalties,
			signatures: [signature],
			uri: data.uri,
		},
		from,
	).send()
	return tokenId
}

export async function mintErc1155Legacy(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	data: LegacyERC1155Request,
) {
	const from = toAddress(await ethereum.getFrom())
	const erc155Contract = createRaribleTokenContract(ethereum, data.collection.id)
	const { tokenId, signature: { v, r, s } } = await getTokenId(nftCollectionApi, data.collection.id, from)
	await erc155Contract.functionCall("mint", tokenId, v, r, s, data.royalties, data.supply, data.uri).send()
	return tokenId
}

export async function mintErc1155New(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	data: LazyErc1155Request,
) {
	const from = toAddress(await ethereum.getFrom())
	const erc1155Contract = createErc1155LazyContract(ethereum, data.collection.id)
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, from)
	const creators = data.creators || [{ account: from, value: 10000 }]
	const nftData: SimpleLazyNft<"signatures"> = {
		"@type": "ERC1155",
		tokenId,
		creators,
		royalties: data.royalties || [],
		contract: data.collection.id,
		uri: data.uri,
		supply: data.supply,
	}
	const signature = await signNft(nftData)
	await erc1155Contract.functionCall(
		"mintAndTransfer",
		{
			tokenId,
			uri: nftData.uri,
			supply: nftData.supply,
			creators,
			royalties: nftData.royalties,
			signatures: [signature],
		},
		from,
		nftData.supply,
	).send()
	return tokenId
}
