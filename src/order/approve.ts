import {
	Address,
	Asset,
	BigNumber,
	Erc1155AssetType,
} from "@rarible/protocol-api-client"
import Web3 from "web3"
import { approveErc20 } from "./approve-erc20"
import {approveErc721} from "./approve-erc721";
import {approveErc1155} from "./approve-erc1155";
import {sentTx} from "../common/send-transaction";
import {toAddress} from "@rarible/types";

export async function approve(
	web3: Web3,
	contract: Address,
	owner: Address,
	operator: Address,
	asset: Asset,
	infinite: undefined | boolean = true
): Promise<Action | undefined> {
	switch (asset.assetType.assetClass) {
		case "ERC20": {
			const action = async () => {
				await approveErc20(sentTx, web3, contract, owner, operator, asset.value, infinite)
			}
			return {
				name: 'approve-erc20',
				value: action
			}
		}
		case "ERC721": {
			const action = async () => {
				await approveErc721(sentTx, web3, contract, owner, operator)
			}
			return{
				name: 'approve-erc721',
				value: action
			}
		}
		case "ERC1155": {
			const action = async () => {
				await approveErc1155(sentTx, web3, contract, owner, operator)
			}
			return {
				name: 'approve-erc1155',
				value: action
			}
		}
		case "ERC721_LAZY":
			break
		case "ERC1155_LAZY":
			break
	}
	return undefined
}

