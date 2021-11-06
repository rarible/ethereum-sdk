import type Web3 from "web3"
import type { Address } from "@rarible/ethereum-api-client"
import type { Contract } from "web3-eth-contract"
import type { AbiItem } from "../../../common/abi-item"

export function createCryptoPunkTransferProxyContract(web3: Web3, address?: Address): Contract {
	return new web3.eth.Contract(punkTransferProxyAbi, address)
}

export async function deployCryptoPunkTransferProxy(web3: Web3) {
	const empty = createCryptoPunkTransferProxyContract(web3)
	const [address] = await web3.eth.getAccounts()
	return empty.deploy({ data: punkTransferProxyBytecode }).send({ from: address, gas: 4000000, gasPrice: "0" })
}

export const punkTransferProxyBytecode = "0x608060405234801561001057600080fd5b5061044d806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806354bc0cf114610030575b600080fd5b61004361003e366004610244565b610045565b005b6000808460000151602001518060200190518101906100649190610217565b91509150836001600160a01b0316826001600160a01b03166358178168836040518263ffffffff1660e01b815260040161009e91906103d2565b602060405180830381600087803b1580156100b857600080fd5b505af11580156100cc573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906100f091906101f4565b6001600160a01b03161461011f5760405162461bcd60e51b8152600401610116906103a3565b60405180910390fd5b60405163104c9fd360e31b81526001600160a01b03831690638264fe989061014b9084906004016103d2565b600060405180830381600087803b15801561016557600080fd5b505af1158015610179573d6000803e3d6000fd5b50506040516322dca8bb60e21b81526001600160a01b0385169250638b72a2ec91506101ab908690859060040161038a565b600060405180830381600087803b1580156101c557600080fd5b505af11580156101d9573d6000803e3d6000fd5b505050505050505050565b80356101ef816103ff565b919050565b600060208284031215610205578081fd5b8151610210816103ff565b9392505050565b60008060408385031215610229578081fd5b8251610234816103ff565b6020939093015192949293505050565b600080600060608486031215610258578081fd5b833567ffffffffffffffff8082111561026f578283fd5b81860191506040808389031215610284578384fd5b8051818101818110848211171561029757fe5b8083528435848111156102a8578687fd5b8501808b038413156102b8578687fd5b6080830182811086821117156102ca57fe5b845280356001600160e01b0319811681146102e3578788fd5b8252602081810135868111156102f7578889fd5b8083019250508b601f83011261030b578788fd5b81358681111561031757fe5b610329601f8201601f191683016103db565b96508087528c8282850101111561033e578889fd5b80828401838901378882828901015250856060850152828452808701358185015283995061036d818c016101e4565b98505050505061037e8188016101e4565b93505050509250925092565b6001600160a01b03929092168252602082015260400190565b60208082526015908201527429b2b63632b9103737ba10383ab7359037bbb732b960591b604082015260600190565b90815260200190565b60405181810167ffffffffffffffff811182821017156103f757fe5b604052919050565b6001600160a01b038116811461041457600080fd5b5056fea26469706673582212208e6ed30c99337cf161c9530245684fa47c984576c11557677f96483699d1973064736f6c63430007060033"

export const punkTransferProxyAbi: AbiItem[] = [
	{
		"inputs": [
			{
				"components": [
					{
						"components": [
							{
								"internalType": "bytes4",
								"name": "assetClass",
								"type": "bytes4",
							},
							{
								"internalType": "bytes",
								"name": "data",
								"type": "bytes",
							},
						],
						"internalType": "struct LibAsset.AssetType",
						"name": "assetType",
						"type": "tuple",
					},
					{
						"internalType": "uint256",
						"name": "value",
						"type": "uint256",
					},
				],
				"internalType": "struct LibAsset.Asset",
				"name": "asset",
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
		"name": "transfer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
]