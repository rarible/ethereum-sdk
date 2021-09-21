import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { toAddress } from "@rarible/types"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { toBn } from "@rarible/utils"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { createTestProviders } from "../common/create-test-providers"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { mint as mintTemplate } from "./mint"
import { signNft } from "./sign-nft"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { burn as burnTemplate } from "./burn"

const { provider, wallet } = createE2eProvider()
const { providers } = createTestProviders(provider, wallet)

describe.each(providers)("burn nfts", (ethereum: Ethereum) => {
	const testAddress = toAddress(wallet.getAddressString())
	const configuration = new Configuration(getApiConfig("e2e"))
	const collectionApi = new NftCollectionControllerApi(configuration)
	const mintLazyApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(ethereum, gatewayApi)
	const checkAssetType = checkAssetTypeTemplate.bind(null, collectionApi)
	const mint = mintTemplate.bind(null, ethereum, send, sign, collectionApi)
	const burn = burnTemplate.bind(null, ethereum, send, checkAssetType)
	const contractErc721 = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	const contractErc1155 = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")
	const testErc721 = createMintableTokenContract(ethereum, contractErc721)
	const testErc1155 = createRaribleTokenContract(ethereum, contractErc1155)

	test("should burn ERC721 legacy token", async () => {
		const minted = await mint(mintLazyApi, {
			collection: {
				supportsLazyMint: false,
				type: "ERC721",
				id: contractErc721,
			},
			uri: "//test",
			royalties: [],
		})
		const testBalance = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(toBn(testBalance).toString()).toBe("1")

		await burn({
			contract: contractErc721,
			tokenId: minted.tokenId,
		})
		const testBalanceAfterBurn = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(toBn(testBalanceAfterBurn).toString()).toBe("0")
	})

	test("should burn ERC1155 legacy token", async () => {
		const minted = await mint(mintLazyApi, {
			collection: {
				supportsLazyMint: false,
				type: "ERC1155",
				id: contractErc1155,
			},
			uri: "//test",
			royalties: [],
			supply: 100,
		})
		await burn({
			contract: contractErc1155,
			tokenId: minted.tokenId,
		}, 50)

		const testBalanceAfterBurn = await testErc1155.functionCall("balanceOf", testAddress, minted.tokenId).call()
		expect(toBn(testBalanceAfterBurn).toString()).toBe("50")
	})
})
