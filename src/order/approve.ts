import {
	Address,
	Asset,
	BigNumber,
	Erc1155AssetType,
} from "@rarible/protocol-api-client"
import Web3 from "web3"
import { approveErc20 } from "./approve-erc20"
import {approveErc721} from "./approve-erc721";

export async function approve(web3: Web3, owner: Address, asset: Asset, infinite: Boolean = true): Promise<Action | undefined> {
	switch (asset.assetType.assetClass) {
		case "ERC20":
			return approveErc20(web3, owner, asset.assetType, asset.value, infinite)
		case "ERC721":
			return approveErc721(web3, owner, asset.assetType, asset.value)
		case "ERC1155":
			return approveErc1155(asset.assetType, asset.value, infinite)
		case "ERC721_LAZY":
			break
		case "ERC1155_LAZY":
			break
	}
	return undefined
}

async function approveErc1155(assetType: Erc1155AssetType, value: BigNumber, infinite: Boolean = true): Promise<Action | undefined> {
	// @ts-ignore
	return null
}
