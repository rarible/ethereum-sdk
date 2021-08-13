import {
	Address,
	Erc1155AssetType,
	Erc1155LazyAssetType,
	Erc20AssetType,
	Erc721AssetType,
	Erc721LazyAssetType,
	EthAssetType,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { TransferProxies } from "../config/type"
import { transferErc721 } from "./transfer-erc721"
import { transferErc1155 } from "./transfer-erc1155"
import { transferErc721Lazy } from "./transfer-erc721-lazy"

type TransferAsset =
	EthAssetType
	| Erc20AssetType
	| Erc721AssetType
	| Erc1155AssetType
	| Erc721LazyAssetType
	| Erc1155LazyAssetType

export async function transfer(
	ethereum: Ethereum,
	nftOwnershipApi: NftOwnershipControllerApi,
	config: TransferProxies,
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
			const contract = config.erc721Lazy
			return transferErc721Lazy(ethereum, nftOwnershipApi, contract, owner, receiver, asset.tokenId)
		}

		// case "ERC1155_LAZY": {
		// 	const contract = config.erc1155Lazy
		// 	return transferErc1155(sendTx, web3, contract, owner, receiver, asset.assetType.tokenId, asset.value)
		// }
	}
	return undefined
}

