import { Ethereum } from "@rarible/ethereum-provider"
import { Erc1155AssetType, Erc721AssetType } from "@rarible/protocol-api-client"
import { CheckAssetTypeFunction, NftAssetType } from "../order/check-asset-type"
import { SendFunction } from "../common/send-transaction"
import { getErc721Contract } from "./contracts/erc721"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc1155Contract } from "./contracts/erc1155"

export async function burn(
	ethereum: Ethereum,
	send: SendFunction,
	checkAssetType: CheckAssetTypeFunction,
	asset: Erc721AssetType | Erc1155AssetType | NftAssetType,
	amount?: number
) {
	const checked = await checkAssetType(asset)
	switch (checked.assetClass) {
		case "ERC721": {
			const erc721Contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, checked.contract)
			const tx = await send(erc721Contract.functionCall("burn", checked.tokenId))
			return tx.hash
		}
		case "ERC1155": {
			if (amount) {
				const erc1155Contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, checked.contract)
				const owner = await ethereum.getFrom()
				const tx = await send(erc1155Contract.functionCall("burn", owner, checked.tokenId, amount))
				return tx.hash
			}
			throw new Error(`amount is ${amount}. Amount for burn ERC1155 is required`)
		}
		default: throw new Error("Unexpected asset class")
	}
}
