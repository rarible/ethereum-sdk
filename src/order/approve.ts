import {
	Address,
	Asset,
	BigNumber,
	Erc1155AssetType,
	Erc20AssetType,
	Erc721AssetType,
} from "@rarible/protocol-api-client"
import { createErc20Contract } from "./contracts/erc20"
import Web3 from "web3"
import { getErc20TransferProxyAddress } from "./addresses"
import { toBn } from "../common/to-bn"
import BN from "bignumber.js"
import { approveErc20 } from "./approve-erc20"

export async function approve(web3: Web3, owner: Address, asset: Asset, infinite: Boolean = true): Promise<Action | undefined> {
	switch (asset.assetType.assetClass) {
		case "ERC20":
			return approveErc20(web3, owner, asset.assetType, asset.value, infinite)
		case "ERC721":
			return approveErc721(asset.assetType, asset.value, infinite)
		case "ERC1155":
			return approveErc1155(asset.assetType, asset.value, infinite)
		case "ERC721_LAZY":
			break
		case "ERC1155_LAZY":
			break
	}
	return undefined
}

async function approveErc721(assetType: Erc721AssetType, value: BigNumber, infinite: Boolean = true): Promise<Action | undefined> {
	// @ts-ignore
	return null
}

async function approveErc1155(assetType: Erc1155AssetType, value: BigNumber, infinite: Boolean = true): Promise<Action | undefined> {
	// @ts-ignore
	return null
}
