import type { Address } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumContract } from "@rarible/ethereum-provider"
import type { AbiItem } from "../../common/abi-item"

export function createExchangeWrapperContract(ethereum: Ethereum, address?: Address): EthereumContract {
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
		"constant": true,
	},
	{
		"inputs": [],
		"name": "looksRare",
		"outputs": [
			{
				"internalType": "contract ILooksRare",
				"name": "",
				"type": "address",
			},
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true,
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address",
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address",
			},
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]",
			},
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]",
			},
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes",
			},
		],
		"name": "onERC1155BatchReceived",
		"outputs": [
			{
				"internalType": "bytes4",
				"name": "",
				"type": "bytes4",
			},
		],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address",
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address",
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256",
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256",
			},
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes",
			},
		],
		"name": "onERC1155Received",
		"outputs": [
			{
				"internalType": "bytes4",
				"name": "",
				"type": "bytes4",
			},
		],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address",
			},
			{
				"internalType": "address",
				"name": "",
				"type": "address",
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256",
			},
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes",
			},
		],
		"name": "onERC721Received",
		"outputs": [
			{
				"internalType": "bytes4",
				"name": "",
				"type": "bytes4",
			},
		],
		"stateMutability": "nonpayable",
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
		"constant": true,
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [],
		"name": "seaPort",
		"outputs": [
			{
				"internalType": "contract ISeaPort",
				"name": "",
				"type": "address",
			},
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true,
	},
	{
		"inputs": [
			{
				"internalType": "bytes4",
				"name": "interfaceId",
				"type": "bytes4",
			},
		],
		"name": "supportsInterface",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool",
			},
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true,
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
		"constant": true,
	},
	{
		"inputs": [],
		"name": "x2y2",
		"outputs": [
			{
				"internalType": "contract Ix2y2",
				"name": "",
				"type": "address",
			},
		],
		"stateMutability": "view",
		"type": "function",
		"constant": true,
	},
	{
		"stateMutability": "payable",
		//@ts-ignore
		"type": "receive",
		"payable": true,
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
			{
				"internalType": "contract ISeaPort",
				"name": "_seaPort",
				"type": "address",
			},
			{
				"internalType": "contract Ix2y2",
				"name": "_x2y2",
				"type": "address",
			},
			{
				"internalType": "contract ILooksRare",
				"name": "_looksRare",
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
				"internalType": "contract ISeaPort",
				"name": "_seaPort",
				"type": "address",
			},
		],
		"name": "setSeaPort",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "contract Ix2y2",
				"name": "_x2y2",
				"type": "address",
			},
		],
		"name": "setX2Y2",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "contract ILooksRare",
				"name": "_looksRare",
				"type": "address",
			},
		],
		"name": "setLooksRare",
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
						"internalType": "bool",
						"name": "addFee",
						"type": "bool",
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
				"internalType": "uint256",
				"name": "originFeeFirst",
				"type": "uint256",
			},
			{
				"internalType": "uint256",
				"name": "originFeeSecond",
				"type": "uint256",
			},
		],
		"name": "singlePurchase",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function",
		"payable": true,
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
						"internalType": "bool",
						"name": "addFee",
						"type": "bool",
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
				"internalType": "uint256",
				"name": "originFeeFirst",
				"type": "uint256",
			},
			{
				"internalType": "uint256",
				"name": "originFeeSecond",
				"type": "uint256",
			},
			{
				"internalType": "bool",
				"name": "allowFail",
				"type": "bool",
			},
		],
		"name": "bulkPurchase",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function",
		"payable": true,
	},
]
