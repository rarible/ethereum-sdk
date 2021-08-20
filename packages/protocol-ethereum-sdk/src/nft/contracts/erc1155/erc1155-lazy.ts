import type { AbiItem } from "web3-utils"
import { Address } from "@rarible/protocol-api-client"
import { Ethereum, EthereumContract } from "@rarible/ethereum-provider"

export function createErc1155LazyContract(ethereum: Ethereum, address?: Address): EthereumContract {
	return ethereum.createContract(erc1155LazyAbi, address)
}

const erc1155LazyAbi: AbiItem[] = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "account",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "operator",
				"type": "address",
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "approved",
				"type": "bool",
			},
		],
		"name": "ApprovalForAll",
		"type": "event",
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
			},
			{
				"components": [
					{
						"internalType": "address payable",
						"name": "account",
						"type": "address",
					},
					{
						"internalType": "uint96",
						"name": "value",
						"type": "uint96",
					},
				],
				"indexed": false,
				"internalType": "struct LibPart.Part[]",
				"name": "creators",
				"type": "tuple[]",
			},
		],
		"name": "Creators",
		"type": "event",
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256",
			},
		],
		"name": "Supply",
		"type": "event",
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "operator",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address",
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "ids",
				"type": "uint256[]",
			},
			{
				"indexed": false,
				"internalType": "uint256[]",
				"name": "values",
				"type": "uint256[]",
			},
		],
		"name": "TransferBatch",
		"type": "event",
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "operator",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address",
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256",
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "value",
				"type": "uint256",
			},
		],
		"name": "TransferSingle",
		"type": "event",
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "value",
				"type": "string",
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256",
			},
		],
		"name": "URI",
		"type": "event",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address",
			},
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256",
			},
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "accounts",
				"type": "address[]",
			},
			{
				"internalType": "uint256[]",
				"name": "ids",
				"type": "uint256[]",
			},
		],
		"name": "balanceOfBatch",
		"outputs": [
			{
				"internalType": "uint256[]",
				"name": "",
				"type": "uint256[]",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address",
			},
			{
				"internalType": "address",
				"name": "operator",
				"type": "address",
			},
		],
		"name": "isApprovedForAll",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address",
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address",
			},
			{
				"internalType": "uint256[]",
				"name": "ids",
				"type": "uint256[]",
			},
			{
				"internalType": "uint256[]",
				"name": "amounts",
				"type": "uint256[]",
			},
			{
				"internalType": "bytes",
				"name": "data",
				"type": "bytes",
			},
		],
		"name": "safeBatchTransferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "from",
				"type": "address",
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address",
			},
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256",
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
		"name": "safeTransferFrom",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address",
			},
			{
				"internalType": "bool",
				"name": "approved",
				"type": "bool",
			},
		],
		"name": "setApprovalForAll",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
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
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "tokenId",
						"type": "uint256",
					},
					{
						"internalType": "string",
						"name": "uri",
						"type": "string",
					},
					{
						"internalType": "uint256",
						"name": "supply",
						"type": "uint256",
					},
					{
						"components": [
							{
								"internalType": "address payable",
								"name": "account",
								"type": "address",
							},
							{
								"internalType": "uint96",
								"name": "value",
								"type": "uint96",
							},
						],
						"internalType": "struct LibPart.Part[]",
						"name": "creators",
						"type": "tuple[]",
					},
					{
						"components": [
							{
								"internalType": "address payable",
								"name": "account",
								"type": "address",
							},
							{
								"internalType": "uint96",
								"name": "value",
								"type": "uint96",
							},
						],
						"internalType": "struct LibPart.Part[]",
						"name": "royalties",
						"type": "tuple[]",
					},
					{
						"internalType": "bytes[]",
						"name": "signatures",
						"type": "bytes[]",
					},
				],
				"internalType": "struct LibERC1155LazyMint.Mint1155Data",
				"name": "data",
				"type": "tuple",
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address",
			},
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256",
			},
		],
		"name": "mintAndTransfer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "uint256",
						"name": "tokenId",
						"type": "uint256",
					},
					{
						"internalType": "string",
						"name": "uri",
						"type": "string",
					},
					{
						"internalType": "uint256",
						"name": "supply",
						"type": "uint256",
					},
					{
						"components": [
							{
								"internalType": "address payable",
								"name": "account",
								"type": "address",
							},
							{
								"internalType": "uint96",
								"name": "value",
								"type": "uint96",
							},
						],
						"internalType": "struct LibPart.Part[]",
						"name": "creators",
						"type": "tuple[]",
					},
					{
						"components": [
							{
								"internalType": "address payable",
								"name": "account",
								"type": "address",
							},
							{
								"internalType": "uint96",
								"name": "value",
								"type": "uint96",
							},
						],
						"internalType": "struct LibPart.Part[]",
						"name": "royalties",
						"type": "tuple[]",
					},
					{
						"internalType": "bytes[]",
						"name": "signatures",
						"type": "bytes[]",
					},
				],
				"internalType": "struct LibERC1155LazyMint.Mint1155Data",
				"name": "data",
				"type": "tuple",
			},
			{
				"internalType": "address",
				"name": "from",
				"type": "address",
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address",
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256",
			},
		],
		"name": "transferFromOrMint",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
]
