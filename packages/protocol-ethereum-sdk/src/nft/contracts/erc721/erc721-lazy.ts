import type { AbiItem } from "web3-utils"
import { Address } from "@rarible/protocol-api-client"
import { Ethereum, EthereumContract } from "@rarible/ethereum-provider"

export function createErc721LazyContract(ethereum: Ethereum, address?: Address): EthereumContract {
	return ethereum.createContract(erc721LazyAbi, address)
}

const erc721LazyAbi: AbiItem[] = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "approved",
				"type": "address",
			},
			{
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
			},
		],
		"name": "Approval",
		"type": "event",
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
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
				"indexed": true,
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
			},
		],
		"name": "Transfer",
		"type": "event",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address",
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
			},
		],
		"name": "approve",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address",
			},
		],
		"name": "balanceOf",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
			},
		],
		"name": "getApproved",
		"outputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address",
			},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
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
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
			},
		],
		"name": "ownerOf",
		"outputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address",
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
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256",
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
				"name": "tokenId",
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
				"name": "_approved",
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
				"name": "tokenId",
				"type": "uint256",
			},
		],
		"name": "transferFrom",
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
				"internalType": "struct LibERC721LazyMint.Mint721Data",
				"name": "data",
				"type": "tuple",
			},
			{
				"internalType": "address",
				"name": "to",
				"type": "address",
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
				"internalType": "struct LibERC721LazyMint.Mint721Data",
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
		],
		"name": "transferFromOrMint",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
]
