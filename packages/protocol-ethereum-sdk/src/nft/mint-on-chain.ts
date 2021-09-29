import type { Ethereum } from "@rarible/ethereum-provider"
import type { NftCollectionControllerApi, Part } from "@rarible/protocol-api-client"
import { Address, BigNumber, toAddress } from "@rarible/types"
import type { SendFunction } from "../common/send-transaction"
import { ERC1155RequestV1, ERC1155RequestV2, ERC721RequestV1, ERC721RequestV2, ERC721RequestV3, MintOnChainResponse, MintResponseTypeEnum } from "./mint"
import { getTokenId } from "./get-token-id"
import { getErc721Contract } from "./contracts/erc721"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc1155Contract } from "./contracts/erc1155"

export async function mintErc721v1(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: ERC721RequestV1
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc721Contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V1, data.collection.id)
	const nftTokenId = await getTokenId(nftCollectionApi, data.collection.id, owner, data.nftTokenId)
	const { tokenId, signature: { v, r, s } } = nftTokenId
	const transaction = await send(erc721Contract.functionCall("mint", tokenId, v, r, s, data.uri))

	return createMintOnChainResponse({
		transaction,
		tokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, tokenId),
	})
}

export async function mintErc721v2(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: ERC721RequestV2
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc721Contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, data.collection.id)
	const nftTokenId = await getTokenId(nftCollectionApi, data.collection.id, owner, data.nftTokenId)
	const { tokenId, signature: { v, r, s } } = nftTokenId
	const royalties = data.royalties.map((x) => ({ recipient: x.account, value: x.value }))
	const transaction = await send(erc721Contract.functionCall("mint", tokenId, v, r, s, royalties, data.uri))

	return createMintOnChainResponse({
		transaction,
		tokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, tokenId),
	})
}

export async function mintErc721v3(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: ERC721RequestV3
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc721Contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, data.collection.id)
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, owner, data.nftTokenId)

	const args = {
		tokenId,
		creators: getCreators(data, owner),
		royalties: data.royalties,
		signatures: ["0x"],
		uri: data.uri,
	}

	const transaction = await send(erc721Contract.functionCall("mintAndTransfer", args, owner))
	return createMintOnChainResponse({
		transaction,
		tokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, tokenId),
	})
}

export async function mintErc1155v1(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: ERC1155RequestV1
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc155Contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, data.collection.id)
	const nftTokenId = await getTokenId(nftCollectionApi, data.collection.id, owner, data.nftTokenId)
	const { tokenId, signature: { v, r, s } } = nftTokenId
	const royalties = data.royalties.map((x) => ({ recipient: x.account, value: x.value }))
	const transaction = await send(erc155Contract.functionCall("mint", tokenId, v, r, s, royalties, data.supply, data.uri))

	return createMintOnChainResponse({
		transaction,
		tokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, tokenId),
	})
}

export async function mintErc1155v2(
	ethereum: Ethereum,
	send: SendFunction,
	nftCollectionApi: NftCollectionControllerApi,
	data: ERC1155RequestV2
): Promise<MintOnChainResponse> {
	const owner = toAddress(await ethereum.getFrom())
	const erc1155Contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V2, data.collection.id)
	const { tokenId } = await getTokenId(nftCollectionApi, data.collection.id, owner, data.nftTokenId)

	const args = {
		tokenId,
		uri: data.uri,
		supply: data.supply,
		creators: getCreators(data, owner),
		royalties: data.royalties,
		signatures: ["0x"],
	}
	const transaction = await send(erc1155Contract.functionCall("mintAndTransfer", args, owner, data.supply))
	return createMintOnChainResponse({
		transaction,
		tokenId,
		contract: data.collection.id,
		owner,
		itemId: createItemId(data.collection.id, tokenId),
	})
}

function getCreators(data: ERC1155RequestV2 | ERC721RequestV3, account: Address): Part[] {
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

function createItemId(contract: Address, tokenId: BigNumber): string {
	return `${contract}:${tokenId}`
}
