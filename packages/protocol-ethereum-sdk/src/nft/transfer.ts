import { Address, Asset } from "@rarible/protocol-api-client"
import Web3 from "web3"
import { TransferProxies } from "../config/type"
import { ContractSendMethod, SendOptions } from "web3-eth-contract"
import { transferErc721 } from "./transfer-erc721"
import { transferErc1155 } from "./transfer-erc1155"

export async function transfer(
	web3: Web3,
	config: TransferProxies,
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	owner: Address,
	receiver: Address,
	asset: Asset,
): Promise<string | undefined> {
	switch (asset.assetType.assetClass) {
		case "ERC721": {
			const contract = asset.assetType.contract
			return transferErc721(sendTx, web3, contract, owner, receiver, asset.assetType.tokenId)
		}
		case "ERC1155": {
			const contract = asset.assetType.contract
			return transferErc1155(sendTx, web3, contract, owner, receiver, asset.assetType.tokenId, asset.value)
		}
		case "ERC721_LAZY":
			const contract = config.erc721Lazy
			return transferErc721(sendTx, web3, contract, owner, receiver, asset.assetType.tokenId)
		case "ERC1155_LAZY": {
			const contract = config.erc1155Lazy
			return transferErc1155(sendTx, web3, contract, owner, receiver, asset.assetType.tokenId, asset.value)
		}
	}
	return undefined
}

