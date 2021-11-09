import type { BigNumber} from "@rarible/types"
import { toAddress, toBinary } from "@rarible/types"
import { toBn } from "@rarible/utils"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Erc1155AssetType, Erc721AssetType } from "@rarible/ethereum-api-client"
import type { Erc1155LazyAssetType, Erc721LazyAssetType } from "@rarible/ethereum-api-client/build/models/AssetType"
import type { CheckAssetTypeFunction, NftAssetType } from "../order/check-asset-type"
import type { SendFunction } from "../common/send-transaction"
import { getOwnershipId } from "../common/get-ownership-id"
import type { RaribleEthereumApis } from "../common/apis"
import { createItemId } from "../common/create-item-id"
import { getErc721Contract } from "./contracts/erc721"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc1155Contract } from "./contracts/erc1155"

export type BurnAsset = Erc721AssetType | Erc1155AssetType | NftAssetType | Erc721LazyAssetType | Erc1155LazyAssetType

export async function burn(
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	checkAssetType: CheckAssetTypeFunction,
	apis: RaribleEthereumApis,
	asset: BurnAsset,
	amount?: BigNumber
): Promise<EthereumTransaction | void> {
	if (!ethereum) {
		throw new Error("Wallet undefined")
	}
	const checked = await checkAssetType(asset)
	const from = toAddress(await ethereum.getFrom())
	const ownership = await apis.nftOwnership.getNftOwnershipByIdRaw({
		ownershipId: getOwnershipId(asset.contract, asset.tokenId, from),
	})
	if (ownership.status === 200) {
		if (toBn(ownership.value.lazyValue).gt(0)) {
			return apis.nftItem.deleteLazyMintNftAsset({
				itemId: createItemId(asset.contract, asset.tokenId),
				burnLazyNftForm: {
					creators: ownership.value.creators.map(c => toAddress(c.account)),
					signatures: [
						toBinary(await ethereum.personalSign(`I would like to burn my ${asset.tokenId} item.`)),
					],
				},
			})
		}
		switch (checked.assetClass) {
			case "ERC721": {
				const erc721Contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, checked.contract)
				return send(erc721Contract.functionCall("burn", checked.tokenId))
			}
			case "ERC1155": {
				if (amount) {
					const erc1155Contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, checked.contract)
					const owner = await ethereum.getFrom()
					return send(erc1155Contract.functionCall("burn", owner, checked.tokenId, amount))
				}
				throw new Error(`amount is ${amount}. Amount for burn ERC1155 is required`)
			}
			default: throw new Error("Unexpected asset class")
		}
	}
	throw new Error("Ownership is not found")
}
