import {
	Address,
	Asset,
} from "@rarible/protocol-api-client"
import Web3 from "web3"
import { approveErc20 } from "./approve-erc20"
import {approveErc721} from "./approve-erc721";
import {approveErc1155} from "./approve-erc1155";
import {sentTx} from "../common/send-transaction";
import {
	getErc1155LazyMintTransferProxy,
	getErc20TransferProxyAddress,
	getErc721LazyMintTransferProxy,
	getTransferProxyAddress
} from "./addresses";

export async function approve(
	web3: Web3,
	owner: Address,
	asset: Asset,
	infinite: undefined | boolean = true
): Promise<string | undefined> {
	const chainId = await web3.eth.getChainId()
	switch (asset.assetType.assetClass) {
		case "ERC20": {
			const contract = asset.assetType.contract
			const operator = getErc20TransferProxyAddress(chainId)
			return approveErc20(sentTx, web3, contract, owner, operator, asset.value, infinite)
		}
		case "ERC721": {
			const contract = asset.assetType.contract
			const operator = getTransferProxyAddress(chainId)
			return approveErc721(sentTx, web3, contract, owner, operator)
		}
		case "ERC1155": {
			const contract = asset.assetType.contract
			const operator = getTransferProxyAddress(chainId)
			return approveErc1155(sentTx, web3, contract, owner, operator)
		}
		case "ERC721_LAZY":
			const contract = asset.assetType.contract
			const operator = getErc721LazyMintTransferProxy(chainId)
			return approveErc721(sentTx, web3, contract, owner, operator)
		case "ERC1155_LAZY": {
			const contract = asset.assetType.contract
			const operator = getErc1155LazyMintTransferProxy(chainId)
			return approveErc1155(sentTx, web3, contract, owner, operator)
		}
	}
	return undefined
}

