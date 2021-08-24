import { Ethereum } from "@rarible/ethereum-provider"
import { Address, Binary, NftCollectionControllerApi } from "@rarible/protocol-api-client"
import { toAddress } from "@rarible/types"
import { toBigNumber } from "@rarible/types/build/big-number"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"
import { SimpleLazyNft } from "./sign-nft"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { MintOnchainRequest } from "./mint"
import { getTokenId } from "./get-token-id"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"

export async function mintOnChain(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	data: MintOnchainRequest,
): Promise<string> {

	const from = toAddress(await ethereum.getFrom())
	const { features } = await nftCollectionApi.getNftCollectionById({ collection: data.contract })

	switch (data["@type"]) {
		case "ERC721": {
			if (features.includes("MINT_AND_TRANSFER")) {
				/**
				 * Mint with new contract
				 */
				return await mintErc721New(ethereum, signNft, nftCollectionApi, data, from)
			} else {
				/**
				 * Mint with legacy contract
				 */
				const erc721Contract = createMintableTokenContract(ethereum, data.contract)
				const { tokenId, signature: { v, r, s } } = await getTokenId(nftCollectionApi, data.contract, from)
				const fees = data.royalties || []
				await erc721Contract.functionCall("mint", tokenId, v, r, s, fees, data.uri).send()
				return tokenId
			}
		}
		case "ERC1155": {
			if (features.includes("MINT_AND_TRANSFER")) {
				/**
				 * Mint with new contract
				 */
				return await mintErc1155New(ethereum, signNft, nftCollectionApi, data, from)

			} else {
				/**
				 * Mint with legacy contract
				 */
				const erc155Contract = createRaribleTokenContract(ethereum, data.contract)
				const { tokenId, signature: { v, r, s } } = await getTokenId(nftCollectionApi, data.contract, from)
				const fees = data.royalties || []
				await erc155Contract.functionCall("mint", tokenId, v, r, s, fees, data.amount, data.uri).send()
				return tokenId
			}
		}
	}
}

async function mintErc721New(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	data: MintOnchainRequest,
	from: Address,
) {

	const erc721Contract = createErc721LazyContract(ethereum, data.contract)
	const { tokenId } = await getTokenId(nftCollectionApi, data.contract, from)
	const creators = data.creators || [{ account: from, value: 10000 }]

	const nftData: SimpleLazyNft<"signatures"> = {
		"@type": "ERC721",
		tokenId,
		creators,
		royalties: data.royalties || [],
		contract: data.contract,
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

async function mintErc1155New(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftCollectionApi: NftCollectionControllerApi,
	data: MintOnchainRequest,
	from: Address,
) {

	const erc1155Contract = createErc1155LazyContract(ethereum, data.contract)
	const { tokenId } = await getTokenId(nftCollectionApi, data.contract, from)
	const creators = data.creators || [{ account: from, value: 10000 }]
	const amount = toBigNumber(data["@type"] === "ERC1155" ? data.amount : "1")

	const nftData: SimpleLazyNft<"signatures"> = {
		"@type": "ERC1155",
		tokenId,
		creators,
		royalties: data.royalties || [],
		contract: data.contract,
		uri: data.uri,
		supply: amount,
	}
	const signature = await signNft(nftData)
	await erc1155Contract.functionCall(
		"mintAndTransfer",
		{
			tokenId,
			uri: nftData.uri,
			supply: amount,
			creators,
			royalties: nftData.royalties,
			signatures: [signature],
		},
		from,
		amount,
	).send()
	return tokenId
}
