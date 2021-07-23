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
): Promise<Action | undefined> {
	const chainId = await web3.eth.getChainId()
	switch (asset.assetType.assetClass) {
		case "ERC20": {
			const contract = asset.assetType.contract
			const operator = getErc20TransferProxyAddress(chainId)
			const action = async () => {
				await approveErc20(sentTx, web3, contract, owner, operator, asset.value, infinite)
			}
			return {
				name: 'approve-erc20',
				value: action
			}
		}
		case "ERC721": {
			const contract = asset.assetType.contract
			const operator = getTransferProxyAddress(chainId)
			const action = async () => {
				await approveErc721(sentTx, web3, contract, owner, operator)
			}
			return{
				name: 'approve-erc721',
				value: action
			}
		}
		case "ERC1155": {
			const contract = asset.assetType.contract
			const operator = getTransferProxyAddress(chainId)
			const action = async () => {
				await approveErc1155(sentTx, web3, contract, owner, operator)
			}
			return {
				name: 'approve-erc1155',
				value: action
			}
		}
		case "ERC721_LAZY":
			const contract = asset.assetType.contract
			const operator = getErc721LazyMintTransferProxy(chainId)
			const action = async () => {
				await approveErc721(sentTx, web3, contract, owner, operator)
			}
			return{
				name: 'approve-erc721-lazy',
				value: action
			}
		case "ERC1155_LAZY": {
			const contract = asset.assetType.contract
			const operator = getErc1155LazyMintTransferProxy(chainId)
			const action = async () => {
				await approveErc1155(sentTx, web3, contract, owner, operator)
			}
			return {
				name: 'approve-erc1155-lazy',
				value: action
			}
		}
	}
	return undefined
}

