import type { Address, Erc1155AssetType, Erc721AssetType, NftItemControllerApi, NftOwnershipControllerApi } from "@rarible/protocol-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { BigNumber, toAddress } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type { CheckAssetTypeFunction, NftAssetType } from "../order/check-asset-type"
import { getOwnershipId } from "../common/get-ownership-id"
import type { SendFunction } from "../common/send-transaction"
import { transferErc721 } from "./transfer-erc721"
import { transferErc1155 } from "./transfer-erc1155"
import { transferNftLazy } from "./transfer-nft-lazy"

export type TransferAsset = NftAssetType | Erc721AssetType | Erc1155AssetType

export async function transfer(
	ethereum: Ethereum,
	send: SendFunction,
	checkAssetType: CheckAssetTypeFunction,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	asset: TransferAsset,
	to: Address,
	amount?: BigNumber
): Promise<EthereumTransaction> {
	const from = toAddress(await ethereum.getFrom())
	const ownership = await nftOwnershipApi.getNftOwnershipByIdRaw({
		ownershipId: getOwnershipId(asset.contract, asset.tokenId, from),
	})
	if (ownership.status === 200) {
		const checkedAssetType = await checkAssetType(asset)
		if (toBn(ownership.value.lazyValue).gt(0)) {
			return transferNftLazy(
				ethereum,
				send,
				nftItemApi,
				asset,
				toAddress(from), to, amount
			)
		}
		switch (checkedAssetType.assetClass) {
			case "ERC721": return transferErc721(ethereum, send, asset.contract, from, to, asset.tokenId)
			case "ERC1155": return transferErc1155(ethereum, send, asset.contract, from, to, asset.tokenId, amount || "1")
			default: throw new Error(`Address ${from} has not any ownerships of token with Id ${asset.tokenId}`)
		}
	} else {
		throw new Error(`Address ${from} has not any ownerships of token with Id ${asset.tokenId}`)
	}
}
