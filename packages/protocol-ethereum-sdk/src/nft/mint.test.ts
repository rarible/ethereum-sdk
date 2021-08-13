import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { EthereumContract } from "@rarible/ethereum-provider"
import { Configuration, NftCollectionControllerApi } from "@rarible/protocol-api-client"
import fetch from "node-fetch"
import { Address, toAddress } from "@rarible/types"
import { createErc721Contract } from "../order/contracts/erc721"
import { createErc1155Contract } from "../order/contracts/erc1155"
import { mint } from "./mint"

describe("mint test", () => {
	const { provider, wallet } = createE2eProvider()
	let testErc721: EthereumContract
	let testErc1155: EthereumContract
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const configuration = new Configuration({ basePath: "https://api-e2e.rarible.com", fetchApi: fetch })
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftO = new NftCollectionControllerApi(configuration)
	const erc721ContractAddress: Address = toAddress("0x2547760120aED692EB19d22A5d9CCfE0f7872fcE")
	const erc1155ContractAddress: Address = toAddress("0x2547760120aED692EB19d22A5d9CCfE0f7872fcE")//todo find erc1155 contract address for e2e
	const minter = toAddress(wallet.getAddressString())
	beforeAll(async () => {
		testErc721 = createErc721Contract(ethereum, erc721ContractAddress)
		testErc1155 = createErc1155Contract(ethereum)
	})
	test("mint Erc721", async () => {
		const mintErc721Hash = await mint(ethereum, nftCollectionApi, {
			assetClass: "ERC721",
			contract: erc721ContractAddress,
			minter,
			to: minter,
			uri: "uri",
		})
		console.log(mintErc721Hash)
	})
	test("mint Erc1155", async () => {
		const mintErc1155Hash = await mint(ethereum, nftCollectionApi, {
			assetClass: "ERC1155",
			contract: erc1155ContractAddress,
			minter,
			amount: 100,
			to: minter,
			uri: "uri",
		})
		console.log(mintErc1155Hash)
	})
})
