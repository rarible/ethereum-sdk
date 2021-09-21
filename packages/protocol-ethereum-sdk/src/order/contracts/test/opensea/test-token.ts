import Web3 from "web3"
import {Address} from "@rarible/protocol-api-client"
import {Contract} from "web3-eth-contract"
import {AbiItem} from "../../../../common/abi-item"

export function createTestTokenContract(web3: Web3, address?: Address): Contract {
	return new web3.eth.Contract(testTokenAbi, address)
}

export async function deployOpenseaTestToken(web3: Web3) {
	const empty = createTestTokenContract(web3)
	const [address] = await web3.eth.getAccounts()
	return empty.deploy({data: testTokenBytecode}).send({from: address, gas: 4000000, gasPrice: "0"})
}

const testTokenAbi: AbiItem[] = [
	{
		"constant": true,
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"name": "",
				"type": "string",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_spender",
				"type": "address",
			},
			{
				"name": "_value",
				"type": "uint256",
			},
		],
		"name": "approve",
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
		"name": "totalSupply",
		"outputs": [
			{
				"name": "",
				"type": "uint256",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_from",
				"type": "address",
			},
			{
				"name": "_to",
				"type": "address",
			},
			{
				"name": "_value",
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
		"name": "decimals",
		"outputs": [
			{
				"name": "",
				"type": "uint256",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"constant": true,
		"inputs": [],
		"name": "MINT_AMOUNT",
		"outputs": [
			{
				"name": "",
				"type": "uint256",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_spender",
				"type": "address",
			},
			{
				"name": "_subtractedValue",
				"type": "uint256",
			},
		],
		"name": "decreaseApproval",
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
		"inputs": [
			{
				"name": "_owner",
				"type": "address",
			},
		],
		"name": "balanceOf",
		"outputs": [
			{
				"name": "",
				"type": "uint256",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"constant": true,
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"name": "",
				"type": "string",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_to",
				"type": "address",
			},
			{
				"name": "_value",
				"type": "uint256",
			},
		],
		"name": "transfer",
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
		"constant": false,
		"inputs": [
			{
				"name": "_spender",
				"type": "address",
			},
			{
				"name": "_addedValue",
				"type": "uint256",
			},
		],
		"name": "increaseApproval",
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
		"inputs": [
			{
				"name": "_owner",
				"type": "address",
			},
			{
				"name": "_spender",
				"type": "address",
			},
		],
		"name": "allowance",
		"outputs": [
			{
				"name": "",
				"type": "uint256",
			},
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor",
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"name": "owner",
				"type": "address",
			},
			{
				"indexed": true,
				"name": "spender",
				"type": "address",
			},
			{
				"indexed": false,
				"name": "value",
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
				"name": "from",
				"type": "address",
			},
			{
				"indexed": true,
				"name": "to",
				"type": "address",
			},
			{
				"indexed": false,
				"name": "value",
				"type": "uint256",
			},
		],
		"name": "Transfer",
		"type": "event",
	},
]

export const testTokenBytecode =
    "0x608060405234801561001057600080fd5b50600160a060020a03331660009081526020819052604090206a108b2a2c28029094000000908190556001556108618061004b6000396000f3006080604052600436106100b95763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166306fdde0381146100be578063095ea7b31461014857806318160ddd1461018057806323b872dd146101a7578063313ce567146101d15780635427789c146101e657806366188463146101fb57806370a082311461021f57806395d89b4114610240578063a9059cbb14610255578063d73dd62314610279578063dd62ed3e1461029d575b600080fd5b3480156100ca57600080fd5b506100d36102c4565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561010d5781810151838201526020016100f5565b50505050905090810190601f16801561013a5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34801561015457600080fd5b5061016c600160a060020a03600435166024356102fb565b604080519115158252519081900360200190f35b34801561018c57600080fd5b50610195610365565b60408051918252519081900360200190f35b3480156101b357600080fd5b5061016c600160a060020a036004358116906024351660443561036b565b3480156101dd57600080fd5b506101956104eb565b3480156101f257600080fd5b506101956104f0565b34801561020757600080fd5b5061016c600160a060020a03600435166024356104ff565b34801561022b57600080fd5b50610195600160a060020a03600435166105f8565b34801561024c57600080fd5b506100d3610613565b34801561026157600080fd5b5061016c600160a060020a036004351660243561064a565b34801561028557600080fd5b5061016c600160a060020a0360043516602435610743565b3480156102a957600080fd5b50610195600160a060020a03600435811690602435166107e5565b60408051808201909152600a81527f5465737420546f6b656e00000000000000000000000000000000000000000000602082015281565b600160a060020a03338116600081815260026020908152604080832094871680845294825280832086905580518681529051929493927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925929181900390910190a350600192915050565b60015490565b6000600160a060020a038316151561038257600080fd5b600160a060020a0384166000908152602081905260409020548211156103a757600080fd5b600160a060020a03808516600090815260026020908152604080832033909416835292905220548211156103da57600080fd5b600160a060020a038416600090815260208190526040902054610403908363ffffffff61081016565b600160a060020a038086166000908152602081905260408082209390935590851681522054610438908363ffffffff61082216565b600160a060020a038085166000908152602081815260408083209490945587831682526002815283822033909316825291909152205461047e908363ffffffff61081016565b600160a060020a038086166000818152600260209081526040808320338616845282529182902094909455805186815290519287169391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef929181900390910190a35060019392505050565b601281565b6a108b2a2c2802909400000081565b600160a060020a0333811660009081526002602090815260408083209386168352929052908120548083111561055c57600160a060020a033381166000908152600260209081526040808320938816835292905290812055610593565b61056c818463ffffffff61081016565b600160a060020a033381166000908152600260209081526040808320938916835292905220555b600160a060020a0333811660008181526002602090815260408083209489168084529482529182902054825190815291517f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259281900390910190a35060019392505050565b600160a060020a031660009081526020819052604090205490565b60408051808201909152600381527f5453540000000000000000000000000000000000000000000000000000000000602082015281565b6000600160a060020a038316151561066157600080fd5b600160a060020a03331660009081526020819052604090205482111561068657600080fd5b600160a060020a0333166000908152602081905260409020546106af908363ffffffff61081016565b600160a060020a0333811660009081526020819052604080822093909355908516815220546106e4908363ffffffff61082216565b600160a060020a03808516600081815260208181526040918290209490945580518681529051919333909316927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a350600192915050565b600160a060020a03338116600090815260026020908152604080832093861683529290529081205461077b908363ffffffff61082216565b600160a060020a0333811660008181526002602090815260408083209489168084529482529182902085905581519485529051929391927f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259281900390910190a350600192915050565b600160a060020a03918216600090815260026020908152604080832093909416825291909152205490565b60008282111561081c57fe5b50900390565b8181018281101561082f57fe5b929150505600a165627a7a72305820921961ca414acd12f609ea65c1e3f056c207625d76b07a529a34cf3076398c530029"
