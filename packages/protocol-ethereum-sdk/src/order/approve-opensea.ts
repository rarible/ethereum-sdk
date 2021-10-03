import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider"
import { Address, toAddress, ZERO_ADDRESS } from "@rarible/types"
import { Asset } from "@rarible/protocol-api-client"
import { backOff } from "exponential-backoff"
import { SendFunction } from "../common/send-transaction"
import { Config } from "../config/type"
import { approveErc20 } from "./approve-erc20"
import { approveErc721 } from "./approve-erc721"
import { approveErc1155 } from "./approve-erc1155"
import { createOpenseaProxyRegistryEthContract } from "./contracts/proxy-registry-opensea"

export async function approveOpensea(
	ethereum: Ethereum,
	send: SendFunction,
	config: Config,
	owner: Address,
	asset: Asset,
	infinite: undefined | boolean = true
): Promise<EthereumTransaction | undefined> {

	switch (asset.assetType.assetClass) {
		case "ERC20": {
			const contract = asset.assetType.contract
			const operator = config.transferProxies.openseaV1
			return approveErc20(ethereum, send, contract, owner, operator, asset.value, infinite)
		}
		case "ERC721": {
			const contract = asset.assetType.contract
			const proxyAddress = await getRegisteredProxy(ethereum, config.proxyRegistries.openseaV1)
			return approveErc721(ethereum, send, contract, owner, proxyAddress)
		}
		case "ERC1155": {
			const contract = asset.assetType.contract
			const proxyAddress = await getRegisteredProxy(ethereum, config.proxyRegistries.openseaV1)
			return approveErc1155(ethereum, send, contract, owner, proxyAddress)
		}
		default: return undefined
	}
}

export async function getRegisteredProxy(
	ethereum: Ethereum,
	proxyRegistry: Address
): Promise<Address> {
	const proxyRegistryContract = createOpenseaProxyRegistryEthContract(ethereum, proxyRegistry)
	const from = toAddress(await ethereum.getFrom())
	const proxyAddress = await getSenderProxy(proxyRegistryContract, from)

	if (proxyAddress === ZERO_ADDRESS) {
		const registerTx = await proxyRegistryContract.functionCall("registerProxy").send()
		await registerTx.wait()

		return backOff(async () => {
			const value = await getSenderProxy(proxyRegistryContract, from)
			if (value === ZERO_ADDRESS) {
				throw new Error("Expected non-zero proxy address")
			}
			return value
		}, {
			maxDelay: 500,
			numOfAttempts: 10,
			delayFirstAttempt: true,
			startingDelay: 100,
		})
	}

	return proxyAddress
}

async function getSenderProxy(registryContract: EthereumContract, sender: Address): Promise<Address> {
	return toAddress(await registryContract.functionCall("proxies", sender).call())
}
