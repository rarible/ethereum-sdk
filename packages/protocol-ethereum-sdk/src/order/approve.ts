import { Address, Asset } from "@rarible/protocol-api-client"
import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { TransferProxies } from "../config/type"
import { approveErc20 } from "./approve-erc20"
import { approveErc721 } from "./approve-erc721"
import { approveErc1155 } from "./approve-erc1155"

export type ApproveFunction =
	(owner: Address, asset: Asset, infinite: undefined | boolean) => Promise<EthereumTransaction | undefined>

export async function approve(
	ethereum: Ethereum,
	config: TransferProxies,
	owner: Address,
	asset: Asset,
	infinite: undefined | boolean = true
): Promise<EthereumTransaction | undefined> {
	switch (asset.assetType.assetClass) {
		case "ERC20": {
			const contract = asset.assetType.contract
			const operator = config.erc20
			return approveErc20(ethereum, contract, owner, operator, asset.value, infinite)
		}
		case "ERC721": {
			const contract = asset.assetType.contract
			const operator = config.nft
			return approveErc721(ethereum, contract, owner, operator)
		}
		case "ERC1155": {
			const contract = asset.assetType.contract
			const operator = config.nft
			return approveErc1155(ethereum, contract, owner, operator)
		}
		case "ERC721_LAZY":
			const contract = asset.assetType.contract
			const operator = config.erc721Lazy
			return approveErc721(ethereum, contract, owner, operator)
		case "ERC1155_LAZY": {
			const contract = asset.assetType.contract
			const operator = config.erc1155Lazy
			return approveErc1155(ethereum, contract, owner, operator)
		}
	}
	return undefined
}
