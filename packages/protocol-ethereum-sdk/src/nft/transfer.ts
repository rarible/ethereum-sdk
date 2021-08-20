import {
	Address,
	Binary,
	Erc1155AssetType,
	Erc721AssetType,
	NftItemControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { toAddress } from "@rarible/types/build/address"
import { toBn } from "../common/to-bn"
import { NftAssetType } from "../order/check-asset-type"
import { transferErc721 } from "./transfer-erc721"
import { transferErc1155 } from "./transfer-erc1155"
import { SimpleLazyNft } from "./sign-nft"
import { transferNftLazy } from "./transfer-nft-lazy"

export type TransferAsset = NftAssetType | Erc721AssetType | Erc1155AssetType

export async function transfer(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	asset: TransferAsset,
	to: Address,
	amount?: BigNumber,
): Promise<string | undefined> {
	const ownership = await nftOwnershipApi.getNftOwnershipsByItem({
		tokenId: asset.tokenId,
		contract: asset.contract,
	})
	const from = toAddress(await ethereum.getFrom())
	const ownershipByFrom = ownership.ownerships.find(o => o.owner.toLowerCase() === from.toLowerCase())
	if (ownershipByFrom) {
		if (toBn(ownershipByFrom.lazyValue).gt("0")) {
			if (amount && toBn(amount).gt(ownershipByFrom.value)) {
				throw new Error(`Account ${from} don't have enough token supply for transfer`)
			}
			return await transferNftLazy(ethereum, signNft, nftItemApi, nftOwnershipApi, asset, toAddress(from), to, amount)
		} else {
			if ("assetClass" in asset) {
				switch (asset["assetClass"]) {
					case "ERC721": {
						return transferErc721(ethereum, asset.contract, from, to, asset.tokenId)
					}
					case "ERC1155": {
						if (amount) {
							return transferErc1155(ethereum, asset.contract, from, to, asset.tokenId, amount)
						} else {
							throw new Error("Amount is undefined or null")
						}
					}
				}
			} else {
				throw new Error("You have not passed the assetClass for the not lazy NFT item")
			}
		}
	} else {
		throw new Error(`Address ${from} has not any ownerships of token with Id ${asset.tokenId}`)
	}
	return undefined
}

