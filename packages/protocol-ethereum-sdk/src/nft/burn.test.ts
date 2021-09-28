import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftLazyMintControllerApi, NftOwnershipControllerApi } from "@rarible/protocol-api-client"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { ERC1155RequestV1, ERC721RequestV2, mint as mintTemplate } from "./mint"
import { signNft } from "./sign-nft"
import { burn as burnTemplate } from "./burn"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc721Contract } from "./contracts/erc721"
import { getErc1155Contract } from "./contracts/erc1155"
import { createErc1155V1Collection, createErc721V2Collection } from "./test/mint"

describe("burn nfts", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const testAddress = toAddress(wallet.getAddressString())
	const configuration = new Configuration(getApiConfig("e2e"))
	const collectionApi = new NftCollectionControllerApi(configuration)
	const ownershipApi = new NftOwnershipControllerApi(configuration)
	const mintLazyApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(ethereum, gatewayApi)
	const checkAssetType = checkAssetTypeTemplate.bind(null, collectionApi)
	const mint = mintTemplate.bind(null, ethereum, send, sign, collectionApi)
	const burn = burnTemplate.bind(null, ethereum, send, checkAssetType, ownershipApi)
	const contractErc721 = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	const contractErc1155 = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")

	test("should burn ERC-721 v2 token", async () => {
		const testErc721 = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, contractErc721)
		const minted = await mint(mintLazyApi, {
			collection: createErc721V2Collection(contractErc721),
			uri: "//test",
			royalties: [],
		} as ERC721RequestV2)
		const testBalance = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(testBalance).toBe("1")

		await burn({
			contract: contractErc721,
			tokenId: minted.tokenId,
		})
		const testBalanceAfterBurn = await testErc721.functionCall("balanceOf", testAddress).call()
		expect(testBalanceAfterBurn).toBe("0")
	}, 10000)

	test("should burn ERC-1155 v1 token", async () => {
		const testErc1155 = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, contractErc1155)
		const minted = await mint(mintLazyApi, {
			collection: createErc1155V1Collection(contractErc1155),
			uri: "//test",
			royalties: [],
			supply: 100,
		} as ERC1155RequestV1)
		await burn({
			contract: contractErc1155,
			tokenId: minted.tokenId,
		}, toBigNumber("50"))

		const testBalanceAfterBurn = await testErc1155.functionCall("balanceOf", testAddress, minted.tokenId).call()
		expect(testBalanceAfterBurn).toBe("50")
	}, 10000)
})
