import type { Ethereum } from "@rarible/ethereum-provider"
import type { NftCollectionControllerApi, NftTokenId, Part } from "@rarible/protocol-api-client"
import { Address, toAddress } from "@rarible/types"
import type { SendFunction } from "../common/send-transaction"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { ERC1155Request, ERC721Request, LegacyERC1155Request, LegacyERC721Request, MintOnChainResponse, MintResponseTypeEnum } from "./mint"
import { getTokenId } from "./get-token-id"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"

export async function mintErc721Legacy(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: LegacyERC721Request
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc721Contract = createMintableTokenContract(ethereum, data.collection.id)
	const nftTokenId = await getTokenId(nftCollectionApi, data.collection.id, owner)
	const { tokenId, signature: { v, r, s } } = nftTokenId
	const transaction = await send(erc721Contract.functionCall("mint", tokenId, v, r, s, data.royalties, data.uri))

	return createMintOnChainResponse({
		transaction,
		nftTokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, nftTokenId),
	})
}

export async function mintErc721New(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: ERC721Request
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc721Contract = createErc721LazyContract(ethereum, data.collection.id)
	const nftTokenId = await getTokenId(nftCollectionApi, data.collection.id, owner)

	const args = {
		tokenId: nftTokenId.tokenId,
		creators: getCreators(data, owner),
		royalties: data.royalties,
		signatures: ["0x"],
		uri: data.uri,
	}

	const transaction = await send(erc721Contract.functionCall("mintAndTransfer", args, owner))
	return createMintOnChainResponse({
		transaction,
		nftTokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, nftTokenId),
	})
}

export async function mintErc1155Legacy(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: LegacyERC1155Request
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc155Contract = createRaribleTokenContract(ethereum, data.collection.id)
	const nftTokenId = await getTokenId(nftCollectionApi, data.collection.id, owner)
	const { tokenId, signature: { v, r, s } } = nftTokenId
	const transaction = await send(erc155Contract.functionCall("mint", tokenId, v, r, s, data.royalties, data.supply, data.uri))

	return createMintOnChainResponse({
		transaction,
		nftTokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, nftTokenId),
	})
}

export async function mintErc1155New(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: ERC1155Request
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc1155Contract = createErc1155LazyContract(ethereum, data.collection.id)
	const nftTokenId = await getTokenId(nftCollectionApi, data.collection.id, owner)

	const args = {
		tokenId: nftTokenId.tokenId,
		uri: data.uri,
		supply: data.supply,
		creators: getCreators(data, owner),
		royalties: data.royalties,
		signatures: ["0x"],
	}
	const transaction = await send(erc1155Contract.functionCall("mintAndTransfer", args, owner, data.supply))
	return createMintOnChainResponse({
		transaction,
		nftTokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, nftTokenId),
	})
}

function getCreators(data: ERC1155Request | ERC721Request, account: Address): Part[] {
	if (data.creators) {
		return data.creators
	}
	return [{
		account,
		value: 10000,
	}]
}

function createMintOnChainResponse(props: Omit<MintOnChainResponse, "type">): MintOnChainResponse {
	return {
		type: MintResponseTypeEnum.ON_CHAIN,
		...props,
	}
}

function createItemId(contract: Address, nftTokenId: NftTokenId): string {
	return `${contract}:${nftTokenId.tokenId}`
}