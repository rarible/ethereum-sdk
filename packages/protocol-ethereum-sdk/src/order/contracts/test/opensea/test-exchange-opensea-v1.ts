import Web3 from "web3"
import {Address} from "@rarible/protocol-api-client"
import {Contract} from "web3-eth-contract"
import {OPENSEA_EXCHANGE_ABI} from "../../exchange-opensea-v1"
import json from "./WyvernExchange.json"

export function createTestOpenSeaExchangeV1Contract(web3: Web3, address?: Address): Contract {
	return new web3.eth.Contract(OPENSEA_EXCHANGE_ABI, address)
}

export async function deployOpenSeaExchangeV1(
	web3: Web3,
	proxyRegistryAddress: string,
	tokenTransferProxyAddress: string,
	testTokenAddress: string,
) {
	const empty = createTestOpenSeaExchangeV1Contract(web3)
	const [address] = await web3.eth.getAccounts()

	const deployed = await empty.deploy({
		data: (json as any).bytecode,
		arguments: [
			proxyRegistryAddress,
			tokenTransferProxyAddress,
			testTokenAddress,
			address,
		],
	})
	return deployed.send({from: address, gas: 20000000, gasPrice: "0"})
	// return deployed.send({from: address, gas: 6108197, gasPrice: "0"})
	// return deployed.send({from: address, gas: estimateGas, gasPrice: "0"})
}
