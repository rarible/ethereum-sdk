import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address, toAddress, ZERO_ADDRESS } from "@rarible/types"
import { Asset } from "@rarible/protocol-api-client"
import { SendFunction } from "../common/send-transaction"
import { Config } from "../config/type"
import { retry } from "../common/retry"
import { approveErc20 } from "./approve-erc20"
import { approveErc721 } from "./approve-erc721"
import { approveErc1155 } from "./approve-erc1155"
import { createOpenseaProxyRegistryEthContract } from "./contracts/proxy-registry-opensea"
import { SimpleOpenSeaV1Order } from "./sign-order"

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

async function getSenderProxy(registryContract: EthereumContract, sender: Address): Promise<Address> {
	return toAddress(await registryContract.functionCall("proxies", sender).call())
}

export async function getRegisteredProxy(
	ethereum: Ethereum,
	proxyRegistry: Address
): Promise<Address> {
	const proxyRegistryContract = createOpenseaProxyRegistryEthContract(ethereum, proxyRegistry)
	const from = toAddress(await ethereum.getFrom())
	let proxyAddress = await getSenderProxy(proxyRegistryContract, from)

	if (proxyAddress === ZERO_ADDRESS) {
		const registerTx = await proxyRegistryContract.functionCall("registerProxy").send()
		await registerTx.wait()

		await retry(10, async () => {
			proxyAddress = await getSenderProxy(proxyRegistryContract, from)
			if (proxyAddress === ZERO_ADDRESS) {
				throw new Error("Expected non-zero proxy address")
			}
		})
	}

	return proxyAddress
}
