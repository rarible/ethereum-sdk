import { Ethereum } from "@rarible/ethereum-provider"
import { Erc1155AssetType, Erc721AssetType } from "@rarible/protocol-api-client"
import { CheckAssetTypeFunction, NftAssetType } from "../order/check-asset-type"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"

export async function burn(
	ethereum: Ethereum,
	checkAssetType: CheckAssetTypeFunction,
	asset: Erc721AssetType | Erc1155AssetType | NftAssetType,
	amount?: number
) {
	const checked = await checkAssetType(asset)
	switch (checked.assetClass) {
		case "ERC721": {
			const erc721Contract = createMintableTokenContract(ethereum, checked.contract)
			const tx = await erc721Contract.functionCall("burn", checked.tokenId).send()
			return tx.hash
		}
		case "ERC1155": {
			if (amount) {
				const erc1155Contract = createRaribleTokenContract(ethereum, checked.contract)
				const owner = await ethereum.getFrom()
				const tx = await erc1155Contract.functionCall("burn", owner, checked.tokenId, amount).send()
				return tx.hash
			} else {
				throw new Error(`amount is ${amount}. Amount for burn ERC1155 is required`)
			}
		}
	}
}
