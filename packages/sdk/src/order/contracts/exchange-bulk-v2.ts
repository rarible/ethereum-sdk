import type { Address } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumContract } from "@rarible/ethereum-provider"
import type { AbiItem } from "../../common/abi-item"

export function createExchangeBulkV2Contract(ethereum: Ethereum, address?: Address): EthereumContract {
	return ethereum.createContract(EXCHANGEV2_BULK_ABI, address)
}

export const EXCHANGEV2_BULK_ABI: AbiItem[] = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address",
			},
		],
		"name": "OwnershipTransferred",
		"type": "event",
	},
	{
		"inputs": [],
		"name": "exchangeV2",
		"outputs": [
			{
				"internalType": "contract IExchangeV2",
				"name": "",
				"type": "address",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address",
			},
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [],
		"name": "wyvernExchange",
		"outputs": [
			{
				"internalType": "contract IWyvernExchange",
				"name": "",
				"type": "address",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "contract IWyvernExchange",
				"name": "_wyvernExchange",
				"type": "address",
			},
			{
				"internalType": "contract IExchangeV2",
				"name": "_exchangeV2",
				"type": "address",
			},
		],
		"name": "__ExchangeBulkV2_init",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "bool",
						"name": "marketWyvern",
						"type": "bool",
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256",
					},
					{
						"internalType": "bytes",
						"name": "tradeData",
						"type": "bytes",
					},
				],
				"internalType": "struct ExchangeBulkV2.TradeDetails[]",
				"name": "tradeDetails",
				"type": "tuple[]",
			},
		],
		"name": "bulkTransfer",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "contract IWyvernExchange",
				"name": "_wyvernExchange",
				"type": "address",
			},
		],
		"name": "setWyvern",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "contract IExchangeV2",
				"name": "_exchangeV2",
				"type": "address",
			},
		],
		"name": "setExchange",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
]
