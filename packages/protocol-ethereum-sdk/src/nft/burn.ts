import { Ethereum } from "@rarible/ethereum-provider"
import { Erc1155AssetType, Erc721AssetType } from "@rarible/protocol-api-client"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"

export async function burn(ethereum: Ethereum, asset: Erc721AssetType | Erc1155AssetType, amount?: number) {
	switch (asset.assetClass) {
		case "ERC721": {
			const erc721Contract = createMintableTokenContract(ethereum, asset.contract)
			const tx = await erc721Contract.functionCall("burn", asset.tokenId).send()
			return tx.hash
		}
		case "ERC1155": {
			if (amount) {
				const erc1155Contract = createRaribleTokenContract(ethereum, asset.contract)
				const owner = await ethereum.getFrom()
				const tx = await erc1155Contract.functionCall("burn", owner, asset.tokenId, amount).send()
				return tx.hash
			} else {
				throw new Error(`amount is ${amount}. Amount for burn ERC1155 is required`)
			}
		}
	}
}
