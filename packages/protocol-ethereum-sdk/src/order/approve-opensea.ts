import {Ethereum, EthereumTransaction} from "@rarible/ethereum-provider"
import {Address} from "@rarible/types"
import {Asset} from "@rarible/protocol-api-client"
import {SendFunction} from "../common/send-transaction"
import {Config} from "../config/type"
import {approveErc20} from "./approve-erc20"
import {approveErc721} from "./approve-erc721"
import {approveErc1155} from "./approve-erc1155"
import {getRegisteredProxy} from "./fill-order"

export async function approveOpensea(
	ethereum: Ethereum,
	send: SendFunction,
	config: Config,
	owner: Address,
	asset: Asset,
	infinite: undefined | boolean = true
): Promise<EthereumTransaction | undefined> {

	const proxyAddress = await getRegisteredProxy(ethereum, config.proxyRegistries.openseaV1)

	switch (asset.assetType.assetClass) {
		case "ERC20": {
			const contract = asset.assetType.contract
			const operator = config.transferProxies.openseaV1
			return approveErc20(ethereum, send, contract, owner, operator, asset.value, infinite)
		}
		case "ERC721": {
			const contract = asset.assetType.contract
			return approveErc721(ethereum, send, contract, owner, proxyAddress)
		}
		case "ERC1155": {
			const contract = asset.assetType.contract
			return approveErc1155(ethereum, send, contract, owner, proxyAddress)
		}
		default: return undefined
	}
}
