import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress } from "@rarible/types"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { mint } from "./mint"
import { Configuration, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import fetch from "node-fetch"
import { signNft } from './sign-nft'
import { EthereumContract } from "@rarible/ethereum-provider"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { burn } from "./burn"
import { toBigNumber } from "@rarible/types/build/big-number"

describe("burn nft's", () => {
	const { provider, wallet } = createE2eProvider()
	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const testAddress = toAddress(wallet.getAddressString())

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org", fetchApi: fetch })
	const collectionApi = new NftCollectionControllerApi(configuration)
	const mintLazyApi = new NftLazyMintControllerApi(configuration)

	const sign = signNft.bind(null, ethereum, 17)

	const contractErc721 = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	const contractErc1155 = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")
	let testErc721: EthereumContract
	let testErc1155: EthereumContract

	beforeAll(async () => {
		testErc721 = await createMintableTokenContract(ethereum, contractErc721)
		testErc1155 = await createRaribleTokenContract(ethereum, contractErc1155)
	})

	test("should burn ERC721 token", async () => {
		const tokenId = await mint(ethereum, sign, collectionApi, mintLazyApi, {
			"@type": "ERC721",
			contract: contractErc721,
			uri: "//test",
		})
		const testBalance = await testErc721.functionCall("balanceOf", testAddress).call()
		await burn(ethereum, {
			assetClass: "ERC721",
			contract: contractErc721,
			tokenId: toBigNumber(tokenId),
		})
		const testBalanceAfterBurn = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(testBalanceAfterBurn).toBe("0")
	})

	test("should burn ERC1155 token", async () => {
		const tokenId = await mint(ethereum, sign, collectionApi, mintLazyApi, {
			"@type": "ERC1155",
			contract: contractErc1155,
			uri: "//test",
			amount: 100,
		})

		await burn(ethereum, {
			assetClass: "ERC1155",
			contract: contractErc1155,
			tokenId: toBigNumber(tokenId)
		}, 50)

		const testBalanceAfterBurn = await testErc1155.functionCall("balanceOf", testAddress, tokenId).call()
		expect(testBalanceAfterBurn).toBe("50")
	})
})
