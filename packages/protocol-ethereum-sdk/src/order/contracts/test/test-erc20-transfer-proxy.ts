import type Web3 from "web3"
import type { Address } from "@rarible/ethereum-api-client"
import type { Contract } from "web3-eth-contract"
import type { AbiItem } from "../../../common/abi-item"

export function createErc20TransferProxyContract(web3: Web3, address?: Address): Contract {
	return new web3.eth.Contract(erc20TransferProxyAbi, address)
}

export async function deployErc20TransferProxy(web3: Web3) {
	const empty = createErc20TransferProxyContract(web3)
	const [address] = await web3.eth.getAccounts()
	return empty.deploy({ data: erc20TransferProxyBytecode }).send({ from: address, gas: 4000000, gasPrice: "0" })
}

const erc20TransferProxyAbi: AbiItem[] = [
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "account",
				type: "address",
			},
		],
		name: "OperatorAdded",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "account",
				type: "address",
			},
		],
		name: "OperatorRemoved",
		type: "event",
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "previousOwner",
				type: "address",
			},
			{
				indexed: true,
				internalType: "address",
				name: "newOwner",
				type: "address",
			},
		],
		name: "OwnershipTransferred",
		type: "event",
	},
	{
		constant: false,
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address",
			},
		],
		name: "addOperator",
		outputs: [],
		payable: false,
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		constant: true,
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address",
			},
		],
		name: "isOperator",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool",
			},
		],
		payable: false,
		stateMutability: "view",
		type: "function",
	},
	{
		constant: true,
		inputs: [],
		name: "isOwner",
		outputs: [
			{
				internalType: "bool",
				name: "",
				type: "bool",
			},
		],
		payable: false,
		stateMutability: "view",
		type: "function",
	},
	{
		constant: true,
		inputs: [],
		name: "owner",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address",
			},
		],
		payable: false,
		stateMutability: "view",
		type: "function",
	},
	{
		constant: false,
		inputs: [
			{
				internalType: "address",
				name: "account",
				type: "address",
			},
		],
		name: "removeOperator",
		outputs: [],
		payable: false,
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		constant: false,
		inputs: [],
		name: "renounceOwnership",
		outputs: [],
		payable: false,
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		constant: false,
		inputs: [
			{
				internalType: "address",
				name: "newOwner",
				type: "address",
			},
		],
		name: "transferOwnership",
		outputs: [],
		payable: false,
		stateMutability: "nonpayable",
		type: "function",
	},
	{
		constant: false,
		inputs: [
			{
				internalType: "contract IERC20",
				name: "token",
				type: "address",
			},
			{
				internalType: "address",
				name: "_from",
				type: "address",
			},
			{
				internalType: "address",
				name: "_to",
				type: "address",
			},
			{
				internalType: "uint256",
				name: "_value",
				type: "uint256",
			},
		],
		name: "erc20safeTransferFrom",
		outputs: [],
		payable: false,
		stateMutability: "nonpayable",
		type: "function",
	},
]

export const erc20TransferProxyBytecode =
	"0x608060405260006100176001600160e01b0361006616565b600080546001600160a01b0319166001600160a01b0383169081178255604051929350917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a35061006a565b3390565b610819806100796000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c80638f32d59b1161005b5780638f32d59b146101315780639870d7fe14610139578063ac8a584a1461015f578063f2fde38b1461018557610088565b80636d70f7ae1461008d578063715018a6146100c7578063776062c3146100d15780638da5cb5b1461010d575b600080fd5b6100b3600480360360208110156100a357600080fd5b50356001600160a01b03166101ab565b604080519115158252519081900360200190f35b6100cf6101c4565b005b6100cf600480360360808110156100e757600080fd5b506001600160a01b03813581169160208101358216916040820135169060600135610255565b61011561037e565b604080516001600160a01b039092168252519081900360200190f35b6100b361038d565b6100cf6004803603602081101561014f57600080fd5b50356001600160a01b03166103b1565b6100cf6004803603602081101561017557600080fd5b50356001600160a01b0316610404565b6100cf6004803603602081101561019b57600080fd5b50356001600160a01b0316610454565b60006101be60018363ffffffff6104a416565b92915050565b6101cc61038d565b61020b576040805162461bcd60e51b815260206004820181905260248201526000805160206107a3833981519152604482015290519081900360640190fd5b600080546040516001600160a01b03909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3600080546001600160a01b0319169055565b61026561026061050b565b6101ab565b6102a05760405162461bcd60e51b815260040180806020018281038252603481526020018061074e6034913960400191505060405180910390fd5b604080516323b872dd60e01b81526001600160a01b0385811660048301528481166024830152604482018490529151918616916323b872dd916064808201926020929091908290030181600087803b1580156102fb57600080fd5b505af115801561030f573d6000803e3d6000fd5b505050506040513d602081101561032557600080fd5b5051610378576040805162461bcd60e51b815260206004820152601a60248201527f6661696c757265207768696c65207472616e7366657272696e67000000000000604482015290519081900360640190fd5b50505050565b6000546001600160a01b031690565b600080546001600160a01b03166103a261050b565b6001600160a01b031614905090565b6103b961038d565b6103f8576040805162461bcd60e51b815260206004820181905260248201526000805160206107a3833981519152604482015290519081900360640190fd5b6104018161050f565b50565b61040c61038d565b61044b576040805162461bcd60e51b815260206004820181905260248201526000805160206107a3833981519152604482015290519081900360640190fd5b61040181610557565b61045c61038d565b61049b576040805162461bcd60e51b815260206004820181905260248201526000805160206107a3833981519152604482015290519081900360640190fd5b6104018161059f565b60006001600160a01b0382166104eb5760405162461bcd60e51b81526004018080602001828103825260228152602001806107c36022913960400191505060405180910390fd5b506001600160a01b03166000908152602091909152604090205460ff1690565b3390565b61052060018263ffffffff61063f16565b6040516001600160a01b038216907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d90600090a250565b61056860018263ffffffff6106c016565b6040516001600160a01b038216907f80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d90600090a250565b6001600160a01b0381166105e45760405162461bcd60e51b81526004018080602001828103825260268152602001806107286026913960400191505060405180910390fd5b600080546040516001600160a01b03808516939216917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e091a3600080546001600160a01b0319166001600160a01b0392909216919091179055565b61064982826104a4565b1561069b576040805162461bcd60e51b815260206004820152601f60248201527f526f6c65733a206163636f756e7420616c72656164792068617320726f6c6500604482015290519081900360640190fd5b6001600160a01b0316600090815260209190915260409020805460ff19166001179055565b6106ca82826104a4565b6107055760405162461bcd60e51b81526004018080602001828103825260218152602001806107826021913960400191505060405180910390fd5b6001600160a01b0316600090815260209190915260409020805460ff1916905556fe4f776e61626c653a206e6577206f776e657220697320746865207a65726f20616464726573734f70657261746f72526f6c653a2063616c6c657220646f6573206e6f74206861766520746865204f70657261746f7220726f6c65526f6c65733a206163636f756e7420646f6573206e6f74206861766520726f6c654f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572526f6c65733a206163636f756e7420697320746865207a65726f2061646472657373a265627a7a723158203dfbaa4f88a24b08132980521a9f96937f77cf9133b07a49d812854457c3a00564736f6c63430005110032"
