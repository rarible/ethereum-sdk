import type { Ethereum, EthereumContract } from "@rarible/ethereum-provider"
import type { Address } from "@rarible/ethereum-api-client"
import type { AbiItem } from "../../common/abi-item"

export function createSeaportWrapper(ethereum: Ethereum, address?: Address): EthereumContract {
	return ethereum.createContract(seaportWrapperAbi, address)
}

export const seaportWrapperAbi: AbiItem[] = [
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
		"stateMutability": "payable",
		// @ts-ignore
		"type": "receive",
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
		"name": "__ExchangeWrapper_init",
		"outputs": [],
		"stateMutability": "nonpayable",
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
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "enum ExchangeWrapper.Markets",
						"name": "marketId",
						"type": "uint8",
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256",
					},
					{
						"internalType": "bytes",
						"name": "data",
						"type": "bytes",
					},
				],
				"internalType": "struct ExchangeWrapper.PurchaseDetails",
				"name": "purchaseDetails",
				"type": "tuple",
			},
			{
				"internalType": "uint256[]",
				"name": "fees",
				"type": "uint256[]",
			},
		],
		"name": "singlePurchase",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "enum ExchangeWrapper.Markets",
						"name": "marketId",
						"type": "uint8",
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256",
					},
					{
						"internalType": "bytes",
						"name": "data",
						"type": "bytes",
					},
				],
				"internalType": "struct ExchangeWrapper.PurchaseDetails[]",
				"name": "purchaseDetails",
				"type": "tuple[]",
			},
			{
				"internalType": "uint256[]",
				"name": "fees",
				"type": "uint256[]",
			},
		],
		"name": "bulkPurchase",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function",
	},
]
