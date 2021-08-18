import {
	Address,
	Binary,
	Erc1155AssetType,
	Erc1155LazyAssetType,
	Erc20AssetType,
	Erc721AssetType,
	Erc721LazyAssetType,
	EthAssetType,
	NftItemControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { transferErc721 } from "./transfer-erc721"
import { transferErc1155 } from "./transfer-erc1155"
import { transferErc721Lazy } from "./transfer-erc721-lazy"
import { SimpleLazyNft } from "./sign-nft"
import { transferErc1155Lazy } from "./transfer-erc1155-lazy"

type TransferAsset =
	EthAssetType
	| Erc20AssetType
	| Erc721AssetType
	| Erc1155AssetType
	| Omit<Erc721LazyAssetType, "signatures" | "uri">
	| Omit<Erc1155LazyAssetType, "signatures" | "uri"> // todo remove uri when we can get uri from api

export async function transfer(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	owner: Address,
	receiver: Address,
	asset: TransferAsset,
	value: BigNumber,
): Promise<string | undefined> {
	switch (asset.assetClass) {
		case "ERC721": {
			const contract = asset.contract
			return transferErc721(ethereum, contract, owner, receiver, asset.tokenId)
		}
		case "ERC1155": {
			const contract = asset.contract
			return transferErc1155(ethereum, contract, owner, receiver, asset.tokenId, value)
		}
		case "ERC721_LAZY": {
			return transferErc721Lazy(ethereum, signNft, nftItemApi, nftOwnershipApi, asset, receiver)
		}

		case "ERC1155_LAZY": {
			return transferErc1155Lazy(ethereum, signNft, nftItemApi, nftOwnershipApi, asset, receiver, value)
		}
	}
	return undefined
}

