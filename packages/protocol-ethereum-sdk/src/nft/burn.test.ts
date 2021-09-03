import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress } from "@rarible/types"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi
} from "@rarible/protocol-api-client"
import { toBigNumber } from "@rarible/types/build/big-number"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { mint as mintTemplate } from "./mint"
import { signNft } from "./sign-nft"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { burn as burnTemplate } from "./burn"

describe("burn nft's", () => {
	const { provider, wallet } = createE2eProvider()
	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const testAddress = toAddress(wallet.getAddressString())

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const collectionApi = new NftCollectionControllerApi(configuration)
	const mintLazyApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(ethereum, gatewayApi)
	const checkAssetType = checkAssetTypeTemplate.bind(null, new NftItemControllerApi(configuration), collectionApi)
	const mint = mintTemplate.bind(null, ethereum, send, sign, collectionApi)
	const burn = burnTemplate.bind(null, ethereum, send, checkAssetType)


	const contractErc721 = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	const contractErc1155 = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")
	const testErc721 = createMintableTokenContract(ethereum, contractErc721)
	const testErc1155 = createRaribleTokenContract(ethereum, contractErc1155)


	test("should burn ERC721 legacy token", async () => {
		const tokenId = await mint(mintLazyApi, {
			collection: { id: contractErc721, type: "ERC721", supportsLazyMint: false },
			uri: "//test",
			royalties: [],
		})

		const testBalance = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(testBalance).toBe("1")

		await burn({
			contract: contractErc721,
			tokenId: toBigNumber(tokenId),
		})
		const testBalanceAfterBurn = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(testBalanceAfterBurn).toBe("0")
	})

	test("should burn ERC1155 legacy token", async () => {
		const tokenId = await mint(mintLazyApi, {
			collection: { id: contractErc1155, type: "ERC1155", supportsLazyMint: false },
			uri: "//test",
			royalties: [],
			supply: 100,
		})

		await burn({
			contract: contractErc1155,
			tokenId: toBigNumber(tokenId),
		}, 50)

		const testBalanceAfterBurn = await testErc1155.functionCall("balanceOf", testAddress, tokenId).call()
		expect(testBalanceAfterBurn).toBe("50")
	})
})
