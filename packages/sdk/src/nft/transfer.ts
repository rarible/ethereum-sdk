import type {
	Address,
	Erc1155AssetType,
	Erc721AssetType,
	NftItemControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import { toAddress, toBigNumber } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type { Maybe } from "@rarible/types/build/maybe"
import type { CheckAssetTypeFunction, NftAssetType } from "../order/check-asset-type"
import { getOwnershipId } from "../common/get-ownership-id"
import type { SendFunction } from "../common/send-transaction"
import { transferErc721 } from "./transfer-erc721"
import { transferErc1155 } from "./transfer-erc1155"
import { transferNftLazy } from "./transfer-nft-lazy"
import { transferCryptoPunk } from "./transfer-crypto-punk"

export type TransferAsset = NftAssetType | Erc721AssetType | Erc1155AssetType

export async function transfer(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	checkAssetType: CheckAssetTypeFunction,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	asset: TransferAsset,
	to: Address,
	amount?: BigNumber
): Promise<EthereumTransaction> {
	if (!ethereum) {
		throw new Error("Wallet undefined")
	}
	const from = toAddress(await ethereum.getFrom())
	const checkedAssetType = await checkAssetType(asset)
	let tokenId: BigNumber
	switch (checkedAssetType.assetClass) {
		case "ERC721":
		case "ERC1155":
			tokenId =  checkedAssetType.tokenId
			break
		case "CRYPTO_PUNKS":
			tokenId = toBigNumber(checkedAssetType.punkId.toString())
			break
		default: {
			throw new Error("Unrecognized collection asset class")
		}
	}
	const ownership = await nftOwnershipApi.getNftOwnershipByIdRaw({
		ownershipId: getOwnershipId(asset.contract, tokenId, from),
	})
	if (ownership.status === 200) {
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
			case "ERC721":
				return transferErc721(ethereum, send, asset.contract, from, to, checkedAssetType.tokenId)
			case "ERC1155":
				return transferErc1155(ethereum, send, asset.contract, from, to, checkedAssetType.tokenId, amount || "1")
			case "CRYPTO_PUNKS":
				return transferCryptoPunk(ethereum, send, asset.contract, to, checkedAssetType.punkId)
			default:
				throw new Error(
					`Not supported asset type: ${checkedAssetType} of contract ${asset.contract}`
				)
		}
	} else {
		throw new Error(`Address ${from} has not any ownerships of token ${asset.contract} with Id ${tokenId}`)
	}
}
