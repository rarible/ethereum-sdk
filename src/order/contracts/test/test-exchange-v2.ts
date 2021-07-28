import type {AbiItem} from "web3-utils";
import Web3 from "web3";
import {Address} from "@rarible/protocol-api-client";
import {Contract} from "web3-eth-contract";

export function createTestExchangeV2Contract(web3: Web3, address?: Address): Contract {
    return new web3.eth.Contract(exchangeV2Abi, address)
}

export async function deployTestExchangeV2(web3: Web3, name: string, symbol: string) {
    const empty = createTestExchangeV2Contract(web3)
    const [address] = await web3.eth.getAccounts()
    return empty
        .deploy({ data: exchangeV2Bytecode, arguments: [name, symbol] })
        .send({ from: address, gas: 4000000, gasPrice: "0" })
}
// todo may be should be a testContractAbi?
const exchangeV2Abi: AbiItem[] = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "hash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "maker",
                "type": "address"
            },
            {
                "components": [
                    {
                        "internalType": "bytes4",
                        "name": "assetClass",
                        "type": "bytes4"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "indexed": false,
                "internalType": "struct LibAsset.AssetType",
                "name": "makeAssetType",
                "type": "tuple"
            },
            {
                "components": [
                    {
                        "internalType": "bytes4",
                        "name": "assetClass",
                        "type": "bytes4"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "indexed": false,
                "internalType": "struct LibAsset.AssetType",
                "name": "takeAssetType",
                "type": "tuple"
            }
        ],
        "name": "Cancel",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "leftHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "rightHash",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "leftMaker",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "rightMaker",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newLeftFill",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newRightFill",
                "type": "uint256"
            },
            {
                "components": [
                    {
                        "internalType": "bytes4",
                        "name": "assetClass",
                        "type": "bytes4"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "indexed": false,
                "internalType": "struct LibAsset.AssetType",
                "name": "leftAsset",
                "type": "tuple"
            },
            {
                "components": [
                    {
                        "internalType": "bytes4",
                        "name": "assetClass",
                        "type": "bytes4"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "indexed": false,
                "internalType": "struct LibAsset.AssetType",
                "name": "rightAsset",
                "type": "tuple"
            }
        ],
        "name": "Match",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes4",
                "name": "assetType",
                "type": "bytes4"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "matcher",
                "type": "address"
            }
        ],
        "name": "MatcherChange",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes4",
                "name": "assetType",
                "type": "bytes4"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "proxy",
                "type": "address"
            }
        ],
        "name": "ProxyChange",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "components": [
                    {
                        "components": [
                            {
                                "internalType": "bytes4",
                                "name": "assetClass",
                                "type": "bytes4"
                            },
                            {
                                "internalType": "bytes",
                                "name": "data",
                                "type": "bytes"
                            }
                        ],
                        "internalType": "struct LibAsset.AssetType",
                        "name": "assetType",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint256",
                        "name": "value",
                        "type": "uint256"
                    }
                ],
                "indexed": false,
                "internalType": "struct LibAsset.Asset",
                "name": "asset",
                "type": "tuple"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "bytes4",
                "name": "transferDirection",
                "type": "bytes4"
            },
            {
                "indexed": false,
                "internalType": "bytes4",
                "name": "transferType",
                "type": "bytes4"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "maker",
                        "type": "address"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes4",
                                        "name": "assetClass",
                                        "type": "bytes4"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "data",
                                        "type": "bytes"
                                    }
                                ],
                                "internalType": "struct LibAsset.AssetType",
                                "name": "assetType",
                                "type": "tuple"
                            },
                            {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct LibAsset.Asset",
                        "name": "makeAsset",
                        "type": "tuple"
                    },
                    {
                        "internalType": "address",
                        "name": "taker",
                        "type": "address"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes4",
                                        "name": "assetClass",
                                        "type": "bytes4"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "data",
                                        "type": "bytes"
                                    }
                                ],
                                "internalType": "struct LibAsset.AssetType",
                                "name": "assetType",
                                "type": "tuple"
                            },
                            {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct LibAsset.Asset",
                        "name": "takeAsset",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint256",
                        "name": "salt",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "start",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "end",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes4",
                        "name": "dataType",
                        "type": "bytes4"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "internalType": "struct LibOrder.Order",
                "name": "order",
                "type": "tuple"
            }
        ],
        "name": "cancel",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "defaultFeeReceiver",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "feeReceivers",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            }
        ],
        "name": "fills",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "maker",
                        "type": "address"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes4",
                                        "name": "assetClass",
                                        "type": "bytes4"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "data",
                                        "type": "bytes"
                                    }
                                ],
                                "internalType": "struct LibAsset.AssetType",
                                "name": "assetType",
                                "type": "tuple"
                            },
                            {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct LibAsset.Asset",
                        "name": "makeAsset",
                        "type": "tuple"
                    },
                    {
                        "internalType": "address",
                        "name": "taker",
                        "type": "address"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes4",
                                        "name": "assetClass",
                                        "type": "bytes4"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "data",
                                        "type": "bytes"
                                    }
                                ],
                                "internalType": "struct LibAsset.AssetType",
                                "name": "assetType",
                                "type": "tuple"
                            },
                            {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct LibAsset.Asset",
                        "name": "takeAsset",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint256",
                        "name": "salt",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "start",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "end",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes4",
                        "name": "dataType",
                        "type": "bytes4"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "internalType": "struct LibOrder.Order",
                "name": "orderLeft",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "signatureLeft",
                "type": "bytes"
            },
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "maker",
                        "type": "address"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes4",
                                        "name": "assetClass",
                                        "type": "bytes4"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "data",
                                        "type": "bytes"
                                    }
                                ],
                                "internalType": "struct LibAsset.AssetType",
                                "name": "assetType",
                                "type": "tuple"
                            },
                            {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct LibAsset.Asset",
                        "name": "makeAsset",
                        "type": "tuple"
                    },
                    {
                        "internalType": "address",
                        "name": "taker",
                        "type": "address"
                    },
                    {
                        "components": [
                            {
                                "components": [
                                    {
                                        "internalType": "bytes4",
                                        "name": "assetClass",
                                        "type": "bytes4"
                                    },
                                    {
                                        "internalType": "bytes",
                                        "name": "data",
                                        "type": "bytes"
                                    }
                                ],
                                "internalType": "struct LibAsset.AssetType",
                                "name": "assetType",
                                "type": "tuple"
                            },
                            {
                                "internalType": "uint256",
                                "name": "value",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct LibAsset.Asset",
                        "name": "takeAsset",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint256",
                        "name": "salt",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "start",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "end",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes4",
                        "name": "dataType",
                        "type": "bytes4"
                    },
                    {
                        "internalType": "bytes",
                        "name": "data",
                        "type": "bytes"
                    }
                ],
                "internalType": "struct LibOrder.Order",
                "name": "orderRight",
                "type": "tuple"
            },
            {
                "internalType": "bytes",
                "name": "signatureRight",
                "type": "bytes"
            }
        ],
        "name": "matchOrders",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "protocolFee",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "royaltiesRegistry",
        "outputs": [
            {
                "internalType": "contract IRoyaltiesProvider",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes4",
                "name": "assetType",
                "type": "bytes4"
            },
            {
                "internalType": "address",
                "name": "matcher",
                "type": "address"
            }
        ],
        "name": "setAssetMatcher",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "newDefaultFeeReceiver",
                "type": "address"
            }
        ],
        "name": "setDefaultFeeReceiver",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "token",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "wallet",
                "type": "address"
            }
        ],
        "name": "setFeeReceiver",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "newProtocolFee",
                "type": "uint256"
            }
        ],
        "name": "setProtocolFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "contract IRoyaltiesProvider",
                "name": "newRoyaltiesRegistry",
                "type": "address"
            }
        ],
        "name": "setRoyaltiesRegistry",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes4",
                "name": "assetType",
                "type": "bytes4"
            },
            {
                "internalType": "address",
                "name": "proxy",
                "type": "address"
            }
        ],
        "name": "setTransferProxy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "contract INftTransferProxy",
                "name": "_transferProxy",
                "type": "address"
            },
            {
                "internalType": "contract IERC20TransferProxy",
                "name": "_erc20TransferProxy",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "newProtocolFee",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "newDefaultFeeReceiver",
                "type": "address"
            },
            {
                "internalType": "contract IRoyaltiesProvider",
                "name": "newRoyaltiesProvider",
                "type": "address"
            }
        ],
        "name": "__ExchangeV2_init",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

export const exchangeV2Bytecode = "0x608060405234801561001057600080fd5b50613d60806100206000396000f3fe6080604052600436106100fe5760003560e01c8063715018a611610095578063b39deb4611610064578063b39deb4614610271578063e2864fe314610291578063e66db25e146102b1578063e99a3f80146102d1578063f2fde38b146102e4576100fe565b8063715018a614610212578063787dce3d146102275780638da5cb5b14610247578063b0e21e8a1461025c576100fe565b806330c642f1116100d157806330c642f1146101a85780633abf6fd4146101c85780633be89922146101dd5780636d8f0694146101fd576100fe565b806302097ab1146101035780631372a625146101395780631cdfe3d81461015b57806320158c441461017b575b600080fd5b34801561010f57600080fd5b5061012361011e36600461338f565b610304565b60405161013091906137ac565b60405180910390f35b34801561014557600080fd5b50610159610154366004613494565b610320565b005b34801561016757600080fd5b5061015961017636600461338f565b6103f4565b34801561018757600080fd5b5061019b61019636600461345f565b610479565b6040516101309190613b5e565b3480156101b457600080fd5b506101596101c3366004613477565b61048c565b3480156101d457600080fd5b5061012361055c565b3480156101e957600080fd5b506101596101f836600461338f565b61056c565b34801561020957600080fd5b506101236105f1565b34801561021e57600080fd5b50610159610601565b34801561023357600080fd5b5061015961024236600461345f565b6106ad565b34801561025357600080fd5b50610123610715565b34801561026857600080fd5b5061019b610724565b34801561027d57600080fd5b5061015961028c366004613477565b61072b565b34801561029d57600080fd5b506101596102ac36600461365f565b6107ef565b3480156102bd57600080fd5b506101596102cc3660046133f4565b6108a1565b6101596102df366004613692565b610932565b3480156102f057600080fd5b506101596102ff36600461338f565b6109ee565b610164602052600090815260409020546001600160a01b031681565b600054610100900460ff16806103395750610339610af1565b80610347575060005460ff16155b6103825760405162461bcd60e51b815260040180806020018281038252602e815260200180613c9a602e913960400191505060405180910390fd5b600054610100900460ff161580156103ad576000805460ff1961ff0019909116610100171660011790555b6103b5610b02565b6103bd610ba4565b6103c78686610c9d565b6103d2848484610d47565b6103da610e23565b80156103ec576000805461ff00191690555b505050505050565b6103fc610ef3565b6001600160a01b031661040d610715565b6001600160a01b031614610456576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b61016380546001600160a01b0319166001600160a01b0392909216919091179055565b61012f6020526000908152604090205481565b610494610ef3565b6001600160a01b03166104a5610715565b6001600160a01b0316146104ee576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b6001600160e01b031982166000818152609760205260409081902080546001600160a01b0319166001600160a01b038516179055517f4b5aced933c0c9a88aeac3f0b3b72c5aaf75df8ebaf53225773248c4c3153593906105509084906137ac565b60405180910390a25050565b610163546001600160a01b031681565b610574610ef3565b6001600160a01b0316610585610715565b6001600160a01b0316146105ce576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b61016280546001600160a01b0319166001600160a01b0392909216919091179055565b610162546001600160a01b031681565b610609610ef3565b6001600160a01b031661061a610715565b6001600160a01b031614610663576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b6033546040516000916001600160a01b0316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3603380546001600160a01b0319169055565b6106b5610ef3565b6001600160a01b03166106c6610715565b6001600160a01b03161461070f576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b61016155565b6033546001600160a01b031690565b6101615481565b610733610ef3565b6001600160a01b0316610744610715565b6001600160a01b03161461078d576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b6001600160e01b031982166000818152606560205260409081902080546001600160a01b0319166001600160a01b038516179055517fd2bf91075f105d0fd80328da28e20ebdad1c1261839711183bc29a44cbe6c72f906105509084906137ac565b80516001600160a01b0316610802610ef3565b6001600160a01b0316146108315760405162461bcd60e51b815260040161082890613a96565b60405180910390fd5b600061083c82610ef7565b600081815261012f602090815260409182902060001990558451908501515160608601515192519394507fbbdc98cb2835f4f846e6a63700d0498b4674f0e8858fd50c6379314227afa04e9361089593869392916137d9565b60405180910390a15050565b6108a9610ef3565b6001600160a01b03166108ba610715565b6001600160a01b031614610903576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b6001600160a01b0391821660009081526101646020526040902080546001600160a01b03191691909216179055565b61093c8484610f6c565b6109468282610f6c565b60408401516001600160a01b0316156109925783604001516001600160a01b031682600001516001600160a01b0316146109925760405162461bcd60e51b815260040161082890613a2b565b60408201516001600160a01b0316156109de5783600001516001600160a01b031682604001516001600160a01b0316146109de5760405162461bcd60e51b81526004016108289061392f565b6109e88483610f83565b50505050565b6109f6610ef3565b6001600160a01b0316610a07610715565b6001600160a01b031614610a50576040805162461bcd60e51b81526020600482018190526024820152600080516020613d0b833981519152604482015290519081900360640190fd5b6001600160a01b038116610a955760405162461bcd60e51b8152600401808060200182810382526026815260200180613c056026913960400191505060405180910390fd5b6033546040516001600160a01b038084169216907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a3603380546001600160a01b0319166001600160a01b0392909216919091179055565b6000610afc3061117b565b15905090565b600054610100900460ff1680610b1b5750610b1b610af1565b80610b29575060005460ff16155b610b645760405162461bcd60e51b815260040180806020018281038252602e815260200180613c9a602e913960400191505060405180910390fd5b600054610100900460ff16158015610b8f576000805460ff1961ff0019909116610100171660011790555b8015610ba1576000805461ff00191690555b50565b600054610100900460ff1680610bbd5750610bbd610af1565b80610bcb575060005460ff16155b610c065760405162461bcd60e51b815260040180806020018281038252602e815260200180613c9a602e913960400191505060405180910390fd5b600054610100900460ff16158015610c31576000805460ff1961ff0019909116610100171660011790555b6000610c3b610ef3565b603380546001600160a01b0319166001600160a01b038316908117909155604051919250906000907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a3508015610ba1576000805461ff001916905550565b60976020527f4532fa16f071d6234e30e1a1e69b9806f04095edf37a1ca7a25c8d6af7861cc080546001600160a01b039283166001600160a01b0319918216179091557f30a684095c937b5aa064dcf94f9903a7d808e3efb22d8389dbd43080ad4ed3d5805493909216928116831790915563025ceed960e61b6000527f4b5822151ea34b7c8d9e37c3e466bcecb631efe6a9f26a4a4054110a93dd316f80549091169091179055565b600054610100900460ff1680610d605750610d60610af1565b80610d6e575060005460ff16155b610da95760405162461bcd60e51b815260040180806020018281038252602e815260200180613c9a602e913960400191505060405180910390fd5b600054610100900460ff16158015610dd4576000805460ff1961ff0019909116610100171660011790555b61016184905561016380546001600160a01b038086166001600160a01b03199283161790925561016280549285169290911691909117905580156109e8576000805461ff001916905550505050565b600054610100900460ff1680610e3c5750610e3c610af1565b80610e4a575060005460ff16155b610e855760405162461bcd60e51b815260040180806020018281038252602e815260200180613c9a602e913960400191505060405180910390fd5b600054610100900460ff16158015610eb0576000805460ff1961ff0019909116610100171660011790555b610b8f6040518060400160405280600881526020016745786368616e676560c01b815250604051806040016040528060018152602001601960f91b815250611181565b3390565b805160208201515160009190610f0c90611242565b606084015151610f1b90611242565b846080015160405160200180856001600160a01b031681526020018481526020018381526020018281526020019450505050506040516020818303038152906040528051906020012090505b919050565b610f75826112ac565b610f7f8282611376565b5050565b600080610f9084846115ce565b915091506000610f9f85610ef7565b90506000610fac85610ef7565b600083815261012f602052604080822054838352908220549293509190610fd589898585611667565b90506000816020015111610ffb5760405162461bcd60e51b81526004016108289061399f565b60808901511561102157602080820151600087815261012f909252604090912090840190555b608088015115611042578051600085815261012f6020526040902090830190555b6000806110528989858e8e6116eb565b8a5191935091506001600160e01b0319166355575f5d60e11b14156110ca5787516001600160e01b0319166355575f5d60e11b141561109057600080fd5b813410156110b05760405162461bcd60e51b815260040161082890613a6e565b813411156110c5576110c53334849003611840565b611119565b87516001600160e01b0319166355575f5d60e11b141561111957803410156111045760405162461bcd60e51b815260040161082890613a6e565b80341115611119576111193334839003611840565b7f268820db288a211986b26a8fda86b1e0046281b21206936bb0e61c67b5c79ef487878d600001518d60000151876020015188600001518f8f604051611166989796959493929190613820565b60405180910390a15050505050505050505050565b3b151590565b600054610100900460ff168061119a575061119a610af1565b806111a8575060005460ff16155b6111e35760405162461bcd60e51b815260040180806020018281038252602e815260200180613c9a602e913960400191505060405180910390fd5b600054610100900460ff1615801561120e576000805460ff1961ff0019909116610100171660011790555b825160208085019190912083519184019190912060c99190915560ca55801561123d576000805461ff00191690555b505050565b8051602091820151805190830120604080517f452a0dc408cb0d27ffc3b3caff933a5208040a53a9dbecd8d89cad2c0d40e00c818601526001600160e01b031990931683820152606080840192909252805180840390920182526080909201909152805191012090565b60a081015115806112c05750428160a00151105b611311576040805162461bcd60e51b815260206004820152601d60248201527f4f726465722073746172742076616c69646174696f6e206661696c6564000000604482015290519081900360640190fd5b60c081015115806113255750428160c00151115b610ba1576040805162461bcd60e51b815260206004820152601b60248201527f4f7264657220656e642076616c69646174696f6e206661696c65640000000000604482015290519081900360640190fd5b60808201516113eb5781516001600160a01b0316611392610ef3565b6001600160a01b0316146113e6576040805162461bcd60e51b815260206004820152601660248201527536b0b5b2b91034b9903737ba103a3c1039b2b73232b960511b604482015290519081900360640190fd5b610f7f565b81516001600160a01b03166113fe610ef3565b6001600160a01b031614610f7f576000611417836118d8565b905061142f83600001516001600160a01b031661117b565b1561156b578251630b135d3f60e11b906001600160a01b0316631626ba7e611456846119c8565b856040518363ffffffff1660e01b81526004018083815260200180602001828103825283818151815260200191508051906020019080838360005b838110156114a9578181015183820152602001611491565b50505050905090810190601f1680156114d65780820380516001836020036101000a031916815260200191505b50935050505060206040518083038186803b1580156114f457600080fd5b505afa158015611508573d6000803e3d6000fd5b505050506040513d602081101561151e57600080fd5b50516001600160e01b031916146115665760405162461bcd60e51b815260040180806020018281038252602b815260200180613c6f602b913960400191505060405180910390fd5b61123d565b82516001600160a01b031661158983611583846119c8565b90611a14565b6001600160a01b03161461123d5760405162461bcd60e51b8152600401808060200182810382526022815260200180613c4d6022913960400191505060405180910390fd5b6115d6613060565b6115de613060565b6020840151516060840151516115f49190611a96565b80519092506001600160e01b03191661161f5760405162461bcd60e51b8152600401610828906139ff565b6060840151516020840151516116359190611a96565b80519091506001600160e01b0319166116605760405162461bcd60e51b8152600401610828906139ff565b9250929050565b61166f613078565b60008061167c8786611ad6565b9150915060008061168d8887611ad6565b91509150838111156116c0576116b584848a60200151602001518b6060015160200151611b1a565b9450505050506116e3565b6116dc8960200151602001518a60600151602001518484611b9f565b9450505050505b949350505050565b600080600061170288600001518860000151611c25565b8651602088015190945092509050600061171b86611cf6565b9050600061172886611cf6565b9050600183600281111561173857fe5b14156117b15787518751611771919084848e8e7f1a0388dd7519a093630516a672419a2562e0e74deb98af068657dc265f0164c9611db7565b94506117ac898960200151886000015185600001517fb45a3ba14423c8f1b71cc094845ab56b5294dbe8d8e3ba53f3cdb63d59a4044b611e75565b611833565b60028360028111156117bf57fe5b1415611833576117fc8860200151876000015183858d8f7fb45a3ba14423c8f1b71cc094845ab56b5294dbe8d8e3ba53f3cdb63d59a4044b611db7565b885188518351929650611833928d9291907f1a0388dd7519a093630516a672419a2562e0e74deb98af068657dc265f0164c9611e75565b5050509550959350505050565b6040516000906001600160a01b0384169083908381818185875af1925050503d806000811461188b576040519150601f19603f3d011682016040523d82523d6000602084013e611890565b606091505b505090508061123d576040805162461bcd60e51b815260206004820152600f60248201526e1d1c985b9cd9995c8819985a5b1959608a1b604482015290519081900360640190fd5b60007f477ed43b8020849b755512278536c3766a3b4ab547519949a75f483372493f8d826000015161190d8460200151611ffd565b846040015161191f8660600151611ffd565b86608001518760a001518860c001518960e001518a610100015180519060200120604051602001808b81526020018a6001600160a01b03168152602001898152602001886001600160a01b03168152602001878152602001868152602001858152602001848152602001836001600160e01b03191681526020018281526020019a5050505050505050505050604051602081830303815290604052805190602001209050919050565b60006119d261206d565b82604051602001808061190160f01b81525060020183815260200182815260200192505050604051602081830303815290604052805190602001209050919050565b60008151604114611a6c576040805162461bcd60e51b815260206004820152601f60248201527f45434453413a20696e76616c6964207369676e6174757265206c656e67746800604482015290519081900360640190fd5b60208201516040830151606084015160001a611a8a868285856120ad565b93505050505b92915050565b611a9e613060565b6000611aaa848461222b565b80519091506001600160e01b031916611acf57611ac7838561222b565b915050611a90565b9050611a90565b600080611af48385606001516020015161258c90919063ffffffff16565b9050611b11846020015160200151856060015160200151836125e9565b91509250929050565b611b22613078565b6000611b2f8585856125e9565b905085811115611b86576040805162461bcd60e51b815260206004820152601860248201527f66696c6c4c6566743a20756e61626c6520746f2066696c6c0000000000000000604482015290519081900360640190fd5b5050604080518082019091529384525050602082015290565b611ba7613078565b6000611bb48387876125e9565b905083811115611c0b576040805162461bcd60e51b815260206004820152601960248201527f66696c6c52696768743a20756e61626c6520746f2066696c6c00000000000000604482015290519081900360640190fd5b604080518082019091529283526020830152509392505050565b60006001600160e01b031983166355575f5d60e11b1415611c4857506001611a90565b6001600160e01b031982166355575f5d60e11b1415611c6957506002611a90565b6001600160e01b031983166322ba176160e21b1415611c8a57506001611a90565b6001600160e01b031982166322ba176160e21b1415611cab57506002611a90565b6001600160e01b0319831663025ceed960e61b1415611ccc57506001611a90565b6001600160e01b0319821663025ceed960e61b1415611ced57506002611a90565b50600092915050565b611cfe613092565b60e08201516001600160e01b031916632611a13360e11b1415611d4757611d2982610100015161264d565b805151909150611d42578151611d3f9082612669565b90505b610f67565b60e08201516001600160e01b03199081161415611d6a578151611d3f9082612669565b6040805162461bcd60e51b815260206004820152601760248201527f556e6b6e6f776e204f7264657220646174612074797065000000000000000000604482015290519081900360640190fd5b6000611dcb8861016154886020015161270a565b90506000611ddc828a8a888761277d565b9050611dec8585838c8c88612869565b9050611e2185828b8a602001518c887fdfdfdaf4cc275341b6776a7ee23b953990b8d991717449077287da70f32cf95561299a565b9050611e5685828b89602001518c887fdfdfdaf4cc275341b6776a7ee23b953990b8d991717449077287da70f32cf95561299a565b9050611e6985828a896000015187611e75565b50979650505050505050565b600084815b6001855103811015611f58576000611ebb868381518110611e9757fe5b6020026020010151602001516001600160601b031689612a2590919063ffffffff16565b9050858281518110611ec957fe5b6020026020010151602001516001600160601b0316840193506000811115611f4f57611ef5838261258c565b9250611f4f60405180604001604052808b81526020018381525088888581518110611f1c57fe5b602002602001015160000151887fa10bb5b2060a412d05113732875a5431ca23453eb93f797e0ffcb5b40e5f2c3e612a3e565b50600101611e7a565b50600084600186510381518110611f6b57fe5b6020026020010151905080602001516001600160601b0316830192508261271014611fa85760405162461bcd60e51b8152600401610828906139c8565b8115611ff357611ff360405180604001604052808a815260200184815250878360000151877fa10bb5b2060a412d05113732875a5431ca23453eb93f797e0ffcb5b40e5f2c3e612a3e565b5050505050505050565b60007fdb6f72e915676cfc289da13bc4ece054fd17b1df6d77ffc4a60510718c236b0861202d8360000151611242565b8360200151604051602001808481526020018381526020018281526020019350505050604051602081830303815290604052805190602001209050919050565b60006120a87f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f61209b612dc5565b6120a3612dcb565b612dd1565b905090565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a082111561210e5760405162461bcd60e51b8152600401808060200182810382526022815260200180613c2b6022913960400191505060405180910390fd5b8360ff16601b148061212357508360ff16601c145b61215e5760405162461bcd60e51b8152600401808060200182810382526022815260200180613cc86022913960400191505060405180910390fd5b600060018686868660405160008152602001604052604051808581526020018460ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa1580156121ba573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b038116612222576040805162461bcd60e51b815260206004820152601860248201527f45434453413a20696e76616c6964207369676e61747572650000000000000000604482015290519081900360640190fd5b95945050505050565b612233613060565b825182516001600160e01b031982166355575f5d60e11b141561229e576001600160e01b031981166355575f5d60e11b1415612273578492505050611a90565b5050604080518082018252600080825282516020818101909452908152918101919091529050611a90565b6001600160e01b031982166322ba176160e21b141561235b576001600160e01b031981166322ba176160e21b141561227357600085602001518060200190518101906122ea91906133ab565b90506000856020015180602001905181019061230691906133ab565b9050806001600160a01b0316826001600160a01b0316141561232e5786945050505050611a90565b50505050604080518082018252600080825282516020818101909452908152918101919091529050611a90565b6001600160e01b031982166339d690a360e11b141561242d576001600160e01b031981166339d690a360e11b14156122735760008086602001518060200190518101906123a891906133c7565b9150915060008087602001518060200190518101906123c791906133c7565b91509150816001600160a01b0316846001600160a01b03161480156123eb57508083145b156123fe57889650505050505050611a90565b505050505050604080518082018252600080825282516020818101909452908152918101919091529050611a90565b6001600160e01b0319821663025ceed960e61b141561247a576001600160e01b0319811663025ceed960e61b14156122735760008086602001518060200190518101906123a891906133c7565b6001600160e01b031982166000908152606560205260409020546001600160a01b0316801561252f576040516306d3f7cb60e41b81526001600160a01b03821690636d3f7cb0906124d19089908990600401613abb565b60006040518083038186803b1580156124e957600080fd5b505afa1580156124fd573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f1916820160405261252591908101906134fb565b9350505050611a90565b6001600160e01b031983811690831614156125745760208087015180519082012086820151805192019190912080821415612571578795505050505050611a90565b50505b60405162461bcd60e51b8152600401610828906138f8565b6000828211156125e3576040805162461bcd60e51b815260206004820152601e60248201527f536166654d6174683a207375627472616374696f6e206f766572666c6f770000604482015290519081900360640190fd5b50900390565b60006125f6848484612e33565b15612639576040805162461bcd60e51b815260206004820152600e60248201526d3937bab73234b7339032b93937b960911b604482015290519081900360640190fd5b6116e3836126478685612ec2565b90612f1b565b612655613092565b81806020019051810190611a9091906135c3565b612671613092565b604080516001808252818301909252600091816020015b6126906130ac565b81526020019060019003908161268857905050905083816000815181106126b357fe5b6020026020010151600001906001600160a01b031690816001600160a01b031681525050612710816000815181106126e757fe5b6020908102919091018101516001600160601b0392909216910152825250919050565b60006127206127198585612a25565b8590612f82565b905060005b82518110156127755761276b61276484838151811061274057fe5b6020026020010151602001516001600160601b031687612a2590919063ffffffff16565b8390612f82565b9150600101612725565b509392505050565b6000806000612793888861016154600202612fdc565b9092509050801561285e5784516000906001600160e01b0319166322ba176160e21b14156127da5785602001518060200190518101906127d391906133ab565b9050612813565b85516001600160e01b03191663025ceed960e61b1415612813576000866020015180602001905181019061280e91906133c7565b509150505b61285c6040518060400160405280888152602001848152508861283584612ffe565b887ff87e69cb514f255f3d32f9d90f25160a10d0cdefe6618a6406db334d4450595c612a3e565b505b509695505050505050565b84516000906001600160e01b03191663025ceed960e61b148015906128a0575085516001600160e01b0319166339d690a360e11b14155b156128ac575083612990565b60008087602001518060200190518101906128c791906133c7565b61016254604051634e53ee3d60e11b81529294509092506000916001600160a01b0390911690639ca7dc7a9061290390869086906004016137c0565b600060405180830381600087803b15801561291d57600080fd5b505af1158015612931573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052612959919081019061342c565b905061298a8a8989848a8a7fb3c5c697ec0b511b76d12f6293e6ee827b1e1df79ac7c64d0466d945904893d761299a565b93505050505b9695505050505050565b8560005b8551811015611e69576000806129d5848a8a86815181106129bb57fe5b6020026020010151602001516001600160601b0316612fdc565b90945084925090508015612a1b57612a1b60405180604001604052808d815260200183815250888a8681518110612a0857fe5b6020026020010151600001518989612a3e565b505060010161299e565b6000612a376127106126478585612ec2565b9392505050565b8451516001600160e01b0319166355575f5d60e11b1415612a77576020850151612a72906001600160a01b03851690611840565b612d7f565b8451516001600160e01b0319166322ba176160e21b1415612b55576000856000015160200151806020019051810190612ab091906133ab565b6322ba176160e21b600052609760209081527f4532fa16f071d6234e30e1a1e69b9806f04095edf37a1ca7a25c8d6af7861cc0549088015160405163776062c360e01b81529293506001600160a01b039091169163776062c391612b1d9185918a918a91906004016138ce565b600060405180830381600087803b158015612b3757600080fd5b505af1158015612b4b573d6000803e3d6000fd5b5050505050612d7f565b8451516001600160e01b0319166339d690a360e11b1415612c5557600080866000015160200151806020019051810190612b8f91906133c7565b915091508660200151600114612bb75760405162461bcd60e51b815260040161082890613973565b6339d690a360e11b60005260976020527f30a684095c937b5aa064dcf94f9903a7d808e3efb22d8389dbd43080ad4ed3d554604051637b84dc8360e11b81526001600160a01b039091169063f709b90690612c1c9085908a908a9087906004016138ce565b600060405180830381600087803b158015612c3657600080fd5b505af1158015612c4a573d6000803e3d6000fd5b505050505050612d7f565b8451516001600160e01b03191663025ceed960e61b1415612cfe57600080866000015160200151806020019051810190612c8f91906133c7565b63025ceed960e61b600052609760209081527f4b5822151ea34b7c8d9e37c3e466bcecb631efe6a9f26a4a4054110a93dd316f54908a0151604051639c1c2ee960e01b81529395509193506001600160a01b031691639c1c2ee991612c1c9186918b918b91889160040161388b565b8451516001600160e01b031916600090815260976020526040908190205490516354bc0cf160e01b81526001600160a01b03909116906354bc0cf190612d4c90889088908890600401613ae0565b600060405180830381600087803b158015612d6657600080fd5b505af1158015612d7a573d6000803e3d6000fd5b505050505b7fcae9d16f553e92058883de29cb3135dbc0c1e31fd7eace79fef1d80577fe482e8585858585604051612db6959493929190613b13565b60405180910390a15050505050565b60c95490565b60ca5490565b6000838383612dde61303d565b3060405160200180868152602001858152602001848152602001838152602001826001600160a01b03168152602001955050505050506040516020818303038152906040528051906020012090509392505050565b600082612e7a576040805162461bcd60e51b815260206004820152601060248201526f6469766973696f6e206279207a65726f60801b604482015290519081900360640190fd5b811580612e85575083155b15612e9257506000612a37565b60008380612e9c57fe5b8584099050612eab8584612ec2565b612eb7826103e8612ec2565b101595945050505050565b600082612ed157506000611a90565b82820282848281612ede57fe5b0414612a375760405162461bcd60e51b8152600401808060200182810382526021815260200180613cea6021913960400191505060405180910390fd5b6000808211612f71576040805162461bcd60e51b815260206004820152601a60248201527f536166654d6174683a206469766973696f6e206279207a65726f000000000000604482015290519081900360640190fd5b818381612f7a57fe5b049392505050565b600082820183811015612a37576040805162461bcd60e51b815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015290519081900360640190fd5b600080612ff285612fed8686612a25565b613041565b91509150935093915050565b6001600160a01b03808216600090815261016460205260408120549091168015613029579050610f67565b5050610163546001600160a01b0316919050565b4690565b6000808284111561305757505080820381611660565b50600093915050565b60408051808201909152600081526060602082015290565b604051806040016040528060008152602001600081525090565b604051806040016040528060608152602001606081525090565b604080518082019091526000808252602082015290565b8035610f6781613bd9565b600082601f8301126130de578081fd5b8151602067ffffffffffffffff808311156130f557fe5b6131028283850201613b67565b838152828101908684016040808702890186018a1015613120578788fd5b875b878110156131885781838c031215613138578889fd5b8151828101818110888211171561314b57fe5b8352835161315881613bd9565b8152838801516001600160601b0381168114613172578a8bfd5b8189015285529386019391810191600101613122565b50919998505050505050505050565b8035610f6781613bee565b600082601f8301126131b2578081fd5b81356131c56131c082613b8b565b613b67565b8181528460208386010111156131d9578283fd5b816020850160208301379081016020019190915292915050565b60006040808385031215613205578182fd5b805181810167ffffffffffffffff828210818311171561322157fe5b81845282945085358181111561323657600080fd5b860180880385131561324757600080fd5b60808401838110838211171561325957fe5b90945283359361326885613bee565b9382526020840135938185111561327e57600080fd5b61328a888683016131a2565b60608501525050815260209384013593019290925292915050565b60006101208083850312156132b8578182fd5b6132c181613b67565b9150506132cd826130c3565b8152602082013567ffffffffffffffff808211156132ea57600080fd5b6132f6858386016131f3565b6020840152613307604085016130c3565b6040840152606084013591508082111561332057600080fd5b61332c858386016131f3565b60608401526080840135608084015260a084013560a084015260c084013560c084015261335b60e08501613197565b60e08401526101009150818401358181111561337657600080fd5b613382868287016131a2565b8385015250505092915050565b6000602082840312156133a0578081fd5b8135612a3781613bd9565b6000602082840312156133bc578081fd5b8151612a3781613bd9565b600080604083850312156133d9578081fd5b82516133e481613bd9565b6020939093015192949293505050565b60008060408385031215613406578182fd5b823561341181613bd9565b9150602083013561342181613bd9565b809150509250929050565b60006020828403121561343d578081fd5b815167ffffffffffffffff811115613453578182fd5b6116e3848285016130ce565b600060208284031215613470578081fd5b5035919050565b60008060408385031215613489578182fd5b823561341181613bee565b600080600080600060a086880312156134ab578081fd5b85356134b681613bd9565b945060208601356134c681613bd9565b93506040860135925060608601356134dd81613bd9565b915060808601356134ed81613bd9565b809150509295509295909350565b6000602080838503121561350d578182fd5b825167ffffffffffffffff80821115613524578384fd5b9084019060408287031215613537578384fd5b60405160408101818110838211171561354c57fe5b604052825161355a81613bee565b8152828401518281111561356c578586fd5b80840193505086601f840112613580578485fd5b825191506135906131c083613b8b565b82815287858486010111156135a3578586fd5b6135b283868301878701613bad565b938101939093525090949350505050565b6000602082840312156135d4578081fd5b815167ffffffffffffffff808211156135eb578283fd5b90830190604082860312156135fe578283fd5b60405160408101818110838211171561361357fe5b604052825182811115613624578485fd5b613630878286016130ce565b825250602083015182811115613644578485fd5b613650878286016130ce565b60208301525095945050505050565b600060208284031215613670578081fd5b813567ffffffffffffffff811115613686578182fd5b6116e3848285016132a5565b600080600080608085870312156136a7578182fd5b843567ffffffffffffffff808211156136be578384fd5b6136ca888389016132a5565b955060208701359150808211156136df578384fd5b6136eb888389016131a2565b94506040870135915080821115613700578384fd5b61370c888389016132a5565b93506060870135915080821115613721578283fd5b5061372e878288016131a2565b91505092959194509250565b600063ffffffff60e01b8251168352602082015160406020850152805180604086015261376e816060870160208501613bad565b601f01601f1916939093016060019392505050565b6000815160408452613798604085018261373a565b602093840151949093019390935250919050565b6001600160a01b0391909116815260200190565b6001600160a01b03929092168252602082015260400190565b8481526001600160a01b03841660208201526080604082018190526000906138039083018561373a565b8281036060840152613815818561373a565b979650505050505050565b888152602081018890526001600160a01b038781166040830152861660608201526080810185905260a0810184905261010060c082018190526000906138688382018661373a565b905082810360e084015261387c818561373a565b9b9a5050505050505050505050565b6001600160a01b03958616815293851660208501529190931660408301526060820192909252608081019190915260c060a0820181905260009082015260e00190565b6001600160a01b039485168152928416602084015292166040820152606081019190915260800190565b60208082526017908201527f6e6f7420666f756e64204941737365744d617463686572000000000000000000604082015260600190565b60208082526024908201527f72696768744f726465722e74616b657220766572696669636174696f6e2066616040820152631a5b195960e21b606082015260800190565b60208082526012908201527132b9319b9918903b30b63ab29032b93937b960711b604082015260600190565b6020808252600f908201526e1b9bdd1a1a5b99c81d1bc8199a5b1b608a1b604082015260600190565b6020808252601e908201527f53756d207061796f75747320427073206e6f7420657175616c20313030250000604082015260600190565b6020808252601290820152710c2e6e6cae8e640c8dedc4ee840dac2e8c6d60731b604082015260600190565b60208082526023908201527f6c6566744f726465722e74616b657220766572696669636174696f6e206661696040820152621b195960ea1b606082015260800190565b6020808252600e908201526d0dcdee840cadcdeeaced040cae8d60931b604082015260600190565b6020808252600b908201526a3737ba10309036b0b5b2b960a91b604082015260600190565b600060408252613ace604083018561373a565b8281036020840152612222818561373a565b600060608252613af36060830186613783565b6001600160a01b0394851660208401529290931660409091015292915050565b600060a08252613b2660a0830188613783565b6001600160a01b0396871660208401529490951660408201526001600160e01b03199283166060820152911660809091015292915050565b90815260200190565b60405181810167ffffffffffffffff81118282101715613b8357fe5b604052919050565b600067ffffffffffffffff821115613b9f57fe5b50601f01601f191660200190565b60005b83811015613bc8578181015183820152602001613bb0565b838111156109e85750506000910152565b6001600160a01b0381168114610ba157600080fd5b6001600160e01b031981168114610ba157600080fdfe4f776e61626c653a206e6577206f776e657220697320746865207a65726f206164647265737345434453413a20696e76616c6964207369676e6174757265202773272076616c75656f72646572207369676e617475726520766572696669636174696f6e206572726f72636f6e7472616374206f72646572207369676e617475726520766572696669636174696f6e206572726f72496e697469616c697a61626c653a20636f6e747261637420697320616c726561647920696e697469616c697a656445434453413a20696e76616c6964207369676e6174757265202776272076616c7565536166654d6174683a206d756c7469706c69636174696f6e206f766572666c6f774f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572a2646970667358221220a087c74c8e21c229f9c283d0d6b1c96f17310f19e6825698abdaa38ceab4997964736f6c63430007060033"
