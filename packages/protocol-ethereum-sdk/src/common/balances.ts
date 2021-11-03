import { Address, BigNumber, toBigNumber } from "@rarible/types"
import { NftItemControllerApi } from "@rarible/ethereum-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import {
	Erc1155AssetType,
	Erc20AssetType,
	Erc721AssetType,
	EthAssetType,
} from "@rarible/ethereum-api-client/build/models/AssetType"
import { getErc721Contract } from "../nft/contracts/erc721"
import { ERC1155VersionEnum, ERC721VersionEnum } from "../nft/contracts/domain"
import { createErc20Contract } from "../order/contracts/erc20"
import { getErc1155Contract } from "../nft/contracts/erc1155"
import { Maybe } from "./maybe"

export type BalanceRequestAssetType =
	EthAssetType |
	Erc20AssetType |
	Erc721AssetType |
	Erc1155AssetType |
	{ assetClass: "ERC721_LAZY", contract: Address, tokenId: BigNumber } |
	{ assetClass: "ERC1155_LAZY", contract: Address, tokenId: BigNumber }

export class Balances {
	constructor(
		private ethereum: Maybe<Ethereum>,
		private nftItemController: NftItemControllerApi
	) {
		this.getBalance = this.getBalance.bind(this)
	}

	async getBalance(address: Address, assetType: BalanceRequestAssetType): Promise<BigNumber> {
		if (!this.ethereum) {
			throw new Error("Wallet is undefined")
		}
		switch (assetType.assetClass) {
			case "ETH": {
				return await this.ethereum.getBalance(address)
			}
			case "ERC20": {
				const contract = createErc20Contract(this.ethereum, assetType.contract)
				return toBigNumber(await contract.functionCall("balanceOf", address).call())
			}
			case "ERC721": {
				const contract = await getErc721Contract(this.ethereum, ERC721VersionEnum.ERC721V1, assetType.contract)
				return toBigNumber(await contract.functionCall("balanceOf", address).call())
			}
			case "ERC1155": {
				const contract = await getErc1155Contract(this.ethereum, ERC1155VersionEnum.ERC1155V1, assetType.contract)
				return toBigNumber(await contract.functionCall("balanceOf", address, assetType.tokenId).call())
			}
			case "ERC721_LAZY":
			case "ERC1155_LAZY": {
				const item = await this.nftItemController.getNftItemById({
					itemId: `${assetType.contract}:${assetType.tokenId}`,
				})
				return item.lazySupply
			}
			default: throw new Error("Asset class is not supported")
		}
	}
}
