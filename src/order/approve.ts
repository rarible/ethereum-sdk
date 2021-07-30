import {
	Address,
	Asset,
} from "@rarible/protocol-api-client"
import Web3 from "web3"
import { approveErc20 } from "./approve-erc20"
import {approveErc721} from "./approve-erc721";
import {approveErc1155} from "./approve-erc1155";
import { TransferProxies } from "../config/type"
import { ContractSendMethod, SendOptions } from "web3-eth-contract"

export async function approve(
	web3: Web3,
	config: TransferProxies,
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	owner: Address,
	asset: Asset,
	infinite: undefined | boolean = true
): Promise<string | undefined> {
	switch (asset.assetType.assetClass) {
		case "ERC20": {
			const contract = asset.assetType.contract
			const operator = config.erc20
			return approveErc20(sendTx, web3, contract, owner, operator, asset.value, infinite)
		}
		case "ERC721": {
			const contract = asset.assetType.contract
			const operator = config.nft
			return approveErc721(sendTx, web3, contract, owner, operator)
		}
		case "ERC1155": {
			const contract = asset.assetType.contract
			const operator = config.nft
			return approveErc1155(sendTx, web3, contract, owner, operator)
		}
		case "ERC721_LAZY":
			const contract = asset.assetType.contract
			const operator = config.erc721Lazy
			return approveErc721(sendTx, web3, contract, owner, operator)
		case "ERC1155_LAZY": {
			const contract = asset.assetType.contract
			const operator = config.erc1155Lazy
			return approveErc1155(sendTx, web3, contract, owner, operator)
		}
	}
	return undefined
}

