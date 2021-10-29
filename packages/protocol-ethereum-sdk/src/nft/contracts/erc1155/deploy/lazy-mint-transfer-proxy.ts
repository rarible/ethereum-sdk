import Web3 from "web3"
import { Address } from "@rarible/types"
import { AbiItem } from "../../../../common/abi-item"

export function createErc1155LazyMintTransferProxyContract(web3: Web3, address?: Address) {
	return new web3.eth.Contract(erc1155LazyMintTransferProxyABI, address)
}

export async function deployErc1155LazyMintTransferProxy(web3: Web3) {
	const contract = createErc1155LazyMintTransferProxyContract(web3)
	const [address] = await web3.eth.getAccounts()

	return contract.deploy({
		data: erc1155LazyMintTransferProxyBytecode,
	})
		.send({ from: address, gas: 5000000, gasPrice: "0" })
}

export const erc1155LazyMintTransferProxyBytecode = "0x608060405234801561001057600080fd5b50610e2e806100206000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c80638da5cb5b1161005b5780638da5cb5b146100a75780639870d7fe146100c5578063ac8a584a146100d8578063f2fde38b146100eb5761007d565b80632ff26a0a1461008257806354bc0cf11461008c578063715018a61461009f575b600080fd5b61008a6100fe565b005b61008a61009a3660046109dd565b6101b0565b61008a6102a6565b6100af610352565b6040516100bc9190610ba6565b60405180910390f35b61008a6100d33660046108c3565b610361565b61008a6100e63660046108c3565b6103e7565b61008a6100f93660046108c3565b61046a565b600054610100900460ff1680610117575061011761056d565b80610125575060005460ff16155b6101605760405162461bcd60e51b815260040180806020018281038252602e815260200180610d83602e913960400191505060405180910390fd5b600054610100900460ff1615801561018b576000805460ff1961ff0019909116610100171660011790555b61019361057e565b61019b61061e565b80156101ad576000805461ff00191690555b50565b606560006101bc610717565b6001600160a01b0316815260208101919091526040016000205460ff166102145760405162461bcd60e51b8152600401808060200182810382526028815260200180610dd16028913960400191505060405180910390fd5b60008084600001516020015180602001905181019061023391906108df565b91509150816001600160a01b031663ffc4e0a782868689602001516040518563ffffffff1660e01b815260040161026d9493929190610bba565b600060405180830381600087803b15801561028757600080fd5b505af115801561029b573d6000803e3d6000fd5b505050505050505050565b6102ae610717565b6001600160a01b03166102bf610352565b6001600160a01b031614610308576040805162461bcd60e51b81526020600482018190526024820152600080516020610db1833981519152604482015290519081900360640190fd5b6033546040516000916001600160a01b0316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3603380546001600160a01b0319169055565b6033546001600160a01b031690565b610369610717565b6001600160a01b031661037a610352565b6001600160a01b0316146103c3576040805162461bcd60e51b81526020600482018190526024820152600080516020610db1833981519152604482015290519081900360640190fd5b6001600160a01b03166000908152606560205260409020805460ff19166001179055565b6103ef610717565b6001600160a01b0316610400610352565b6001600160a01b031614610449576040805162461bcd60e51b81526020600482018190526024820152600080516020610db1833981519152604482015290519081900360640190fd5b6001600160a01b03166000908152606560205260409020805460ff19169055565b610472610717565b6001600160a01b0316610483610352565b6001600160a01b0316146104cc576040805162461bcd60e51b81526020600482018190526024820152600080516020610db1833981519152604482015290519081900360640190fd5b6001600160a01b0381166105115760405162461bcd60e51b8152600401808060200182810382526026815260200180610d5d6026913960400191505060405180910390fd5b6033546040516001600160a01b038084169216907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a3603380546001600160a01b0319166001600160a01b0392909216919091179055565b60006105783061071b565b15905090565b600054610100900460ff1680610597575061059761056d565b806105a5575060005460ff16155b6105e05760405162461bcd60e51b815260040180806020018281038252602e815260200180610d83602e913960400191505060405180910390fd5b600054610100900460ff1615801561019b576000805460ff1961ff00199091166101001716600117905580156101ad576000805461ff001916905550565b600054610100900460ff1680610637575061063761056d565b80610645575060005460ff16155b6106805760405162461bcd60e51b815260040180806020018281038252602e815260200180610d83602e913960400191505060405180910390fd5b600054610100900460ff161580156106ab576000805460ff1961ff0019909116610100171660011790555b60006106b5610717565b603380546001600160a01b0319166001600160a01b038316908117909155604051919250906000907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a35080156101ad576000805461ff001916905550565b3390565b803b15155b919050565b600061073861073384610cf5565b610cb3565b905082815283838301111561074c57600080fd5b61075a836020830184610d17565b9392505050565b803561072081610d47565b600082601f83011261077c578081fd5b8151602061078c61073383610cd7565b82815281810190858301855b858110156107d6578151880189603f8201126107b2578788fd5b6107c38a8783015160408401610725565b8552509284019290840190600101610798565b5090979650505050505050565b600082601f8301126107f3578081fd5b8151602061080361073383610cd7565b82815281810190858301604080860288018501891015610821578687fd5b865b868110156108965781838b031215610839578788fd5b815182810181811067ffffffffffffffff8211171561085457fe5b8352835161086181610d47565b8152838701516bffffffffffffffffffffffff8116811461088057898afd5b8188015285529385019391810191600101610823565b509198975050505050505050565b600082601f8301126108b4578081fd5b61075a83835160208501610725565b6000602082840312156108d4578081fd5b813561075a81610d47565b600080604083850312156108f1578081fd5b82516108fc81610d47565b602084015190925067ffffffffffffffff80821115610919578283fd5b9084019060c0828703121561092c578283fd5b61093660c0610cb3565b8251815260208301518281111561094b578485fd5b610957888286016108a4565b60208301525060408301516040820152606083015182811115610978578485fd5b610984888286016107e3565b60608301525060808301518281111561099b578485fd5b6109a7888286016107e3565b60808301525060a0830151828111156109be578485fd5b6109ca8882860161076c565b60a0830152508093505050509250929050565b6000806000606084860312156109f1578081fd5b833567ffffffffffffffff80821115610a08578283fd5b81860191506040808389031215610a1d578384fd5b80518181018181108482111715610a3057fe5b808352843584811115610a41578687fd5b8501808b03841315610a51578687fd5b608083018281108682111715610a6357fe5b845280356001600160e01b031981168114610a7c578788fd5b825260208181013586811115610a90578889fd5b82019550601f86018c13610aa2578788fd5b85359150610ab261073383610cf5565b8281528c82848901011115610ac5578889fd5b828288018383013788828483010152806060860152508284528087013581850152839950610af4818c01610761565b985050505050610b05818801610761565b93505050509250925092565b6001600160a01b03169052565b6000815180845260208085019450808401835b83811015610b6f57815180516001600160a01b031688528301516bffffffffffffffffffffffff168388015260409096019590820190600101610b31565b509495945050505050565b60008151808452610b92816020860160208601610d17565b601f01601f19169290920160200192915050565b6001600160a01b0391909116815260200190565b6000608082528551608083015260208087015160c060a0850152610be2610140850182610b7a565b9050604088015160c08501526060880151607f19808684030160e0870152610c0a8383610b1e565b925060808a015191508086840301610100870152610c288383610b1e565b60a08b0151878203909201610120880152815180825290935090840191508383019084810284018501865b82811015610c8157601f19868303018452610c6f828651610b7a565b94870194938701939150600101610c53565b508096505050505050610c9681840187610b11565b50610ca46040830185610b11565b82606083015295945050505050565b60405181810167ffffffffffffffff81118282101715610ccf57fe5b604052919050565b600067ffffffffffffffff821115610ceb57fe5b5060209081020190565b600067ffffffffffffffff821115610d0957fe5b50601f01601f191660200190565b60005b83811015610d32578181015183820152602001610d1a565b83811115610d41576000848401525b50505050565b6001600160a01b03811681146101ad57600080fdfe4f776e61626c653a206e6577206f776e657220697320746865207a65726f2061646472657373496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a65644f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e65724f70657261746f72526f6c653a2063616c6c6572206973206e6f7420746865206f70657261746f72a2646970667358221220dd63c69999fe475ac0b775ee2ffdd58ccd554e531e20dc18a2fcb2552af1fdd664736f6c63430007060033"
export const erc1155LazyMintTransferProxyABI: AbiItem[] = [
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
		"name": "__OperatorRole_init",
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
		],
		"name": "addOperator",
		"outputs": [],
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
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address",
			},
		],
		"name": "removeOperator",
		"outputs": [],
		"stateMutability": "nonpayable",
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