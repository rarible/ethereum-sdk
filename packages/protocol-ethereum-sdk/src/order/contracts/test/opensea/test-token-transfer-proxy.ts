import Web3 from "web3"
import { Address } from "@rarible/protocol-api-client"
import { Contract } from "web3-eth-contract"
import { AbiItem } from "../../../../common/abi-item"

export function createOpenseaTokenTransferProxyContract(web3: Web3, address?: Address): Contract {
	return new web3.eth.Contract(tokenTransferProxyAbi, address)
}

export async function deployOpenseaTokenTransferProxy(web3: Web3, proxyRegistryAddress: string) {
	const empty = createOpenseaTokenTransferProxyContract(web3)
	const [address] = await web3.eth.getAccounts()
	return empty.deploy({
		data: tokenTransferProxyBytecode,
		arguments: [
			proxyRegistryAddress,
		],
	}).send({ from: address, gas: 4000000, gasPrice: "0" })
}

const tokenTransferProxyAbi: AbiItem[] = [
	{
		"constant": false,
		"inputs": [
			{
				"name": "token",
				"type": "address",
			},
			{
				"name": "from",
				"type": "address",
			},
			{
				"name": "to",
				"type": "address",
			},
			{
				"name": "amount",
				"type": "uint256",
			},
		],
		"name": "transferFrom",
		"outputs": [
			{
				"name": "",
				"type": "bool",
			},
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"constant": true,
		"inputs": [],
		"name": "registry",
		"outputs": [
			{
				"name": "",
				"type": "address",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{
				"name": "registryAddr",
				"type": "address",
			},
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor",
	},
]

export const tokenTransferProxyBytecode =
    "0x608060405234801561001057600080fd5b506040516020806102db833981016040525160008054600160a060020a03909216600160a060020a0319909216919091179055610289806100526000396000f30060806040526004361061004b5763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166315dacbea81146100505780637b103999146100a1575b600080fd5b34801561005c57600080fd5b5061008d73ffffffffffffffffffffffffffffffffffffffff600435811690602435811690604435166064356100df565b604080519115158252519081900360200190f35b3480156100ad57600080fd5b506100b6610241565b6040805173ffffffffffffffffffffffffffffffffffffffff9092168252519081900360200190f35b60008054604080517f69dc9ff300000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff3381166004830152915191909216916369dc9ff391602480830192602092919082900301818787803b15801561015457600080fd5b505af1158015610168573d6000803e3d6000fd5b505050506040513d602081101561017e57600080fd5b5051151561018b57600080fd5b604080517f23b872dd00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff86811660048301528581166024830152604482018590529151918716916323b872dd916064808201926020929091908290030181600087803b15801561020c57600080fd5b505af1158015610220573d6000803e3d6000fd5b505050506040513d602081101561023657600080fd5b505195945050505050565b60005473ffffffffffffffffffffffffffffffffffffffff16815600a165627a7a723058208e7a3d488e4a6d041665cacc374fff336da69e49386f57ae116058af563a47670029"
