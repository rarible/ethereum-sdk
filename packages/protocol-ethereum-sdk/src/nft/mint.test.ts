import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress } from "@rarible/types"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { signNft } from "./sign-nft"
import { ERC1155RequestV1, ERC1155RequestV2, ERC721RequestV1, ERC721RequestV2, ERC721RequestV3, mint as mintTemplate } from "./mint"
import { deployErc721V1 } from "./contracts/erc721/deploy/v1"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc721Contract } from "./contracts/erc721"
import { getErc1155Contract } from "./contracts/erc1155"
import { createErc1155V1Collection, createErc1155V2Collection, createErc721V1Collection, createErc721V2Collection, createErc721V3Collection } from "./test/mint"

describe("mint test", () => {
	const { provider, wallet } = createE2eProvider()
	const minter = toAddress(wallet.getAddressString())
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3, from: minter })
	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const sign = signNft.bind(null, ethereum, 17)

	const mint = mintTemplate
		.bind(null, ethereum, send, sign, nftCollectionApi)
		.bind(null, nftLazyMintApi)

	const e2eErc721V3ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const e2eErc1155V2ContractAddress = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")

	test("mint ERC-721 v1", async () => {
		const deployed = await deployErc721V1(web3, "Test", "ERC721V1")
		if (!deployed.contractAddress) {
			throw new Error("No deployed contract")
		}
		const address = toAddress(deployed.contractAddress)
		await mint({
			uri: "uri",
			collection: createErc721V1Collection(address),
		} as ERC721RequestV1)
		const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V1, address)
		const balanceOfMinter = await contract.functionCall("balanceOf", minter).call()
		expect(balanceOfMinter).toBe("1")
	}, 20000)

	test("mint ERC-721 v2", async () => {
		const mintableTokenE2eAddress = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
		await mint({
			uri: "uri",
			royalties: [{
				account: minter,
				value: 250,
			}],
			collection: createErc721V2Collection(mintableTokenE2eAddress),
		} as ERC721RequestV2)
		const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, mintableTokenE2eAddress)
		const balanceOfMinter = await contract.functionCall("balanceOf", minter).call()
		expect(balanceOfMinter).toBe("1")
	})

	test("use provided nftTokenId", async () => {
		const collection = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
		const nftTokenId = await nftCollectionApi.generateNftTokenId({ collection, minter })
		const result = await mint({
			uri: "uri",
			royalties: [{
				account: minter,
				value: 250,
			}],
			collection: createErc721V2Collection(collection),
			nftTokenId,
		} as ERC721RequestV2)
		expect(result.tokenId).toBe(nftTokenId.tokenId)
	})

	test("mint ERC-1155 v1", async () => {
		const raribleTokenE2eAddress = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")
		const uri = "test1155"
		const supply = 101
		const minted = await mint({
			collection: createErc1155V1Collection(raribleTokenE2eAddress),
			uri,
			supply,
			royalties: [{
				account: minter,
				value: 250,
			}],
		} as ERC1155RequestV1)
		const contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, raribleTokenE2eAddress)
		const balanceOfMinter: string = await contract.functionCall("balanceOf", minter, minted.tokenId).call()
		expect(balanceOfMinter).toBe(supply.toString())
	})

	test("mint ERC-721 v3", async () => {
		await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "uri",
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: false,
		} as ERC721RequestV3)
		const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, e2eErc721V3ContractAddress)
		const balanceOfMinter: string = await contract.functionCall("balanceOf", minter).call()
		expect(balanceOfMinter).toEqual("1")
	}, 10000)

	test("mint ERC-1155 v2", async () => {
		const minted = await mint({
			collection: createErc1155V2Collection(e2eErc1155V2ContractAddress),
			uri: "uri",
			supply: 100,
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: false,
		} as ERC1155RequestV2)
		const contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V2, e2eErc1155V2ContractAddress)
		const balanceOfMinter: string = await contract.functionCall("balanceOf", minter, minted.tokenId).call()
		expect(balanceOfMinter).toEqual("100")
	}, 10000)

	test("mint ERC-721 v3 lazy", async () => {
		const minted = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "uri",
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC721RequestV3)
		const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })
		expect(resultNft.lazySupply).toEqual("1")

		const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
		expect(lazy.uri).toBe("uri")
	}, 10000)

	test("mint ERC-1155 v2 lazy", async () => {
		const minted = await mint({
			collection: createErc1155V2Collection(e2eErc1155V2ContractAddress),
			uri: "uri",
			supply: 100,
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC1155RequestV2)
		const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })
		expect(resultNft.lazySupply).toEqual("100")

		const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
		expect(lazy.uri).toBe("uri")
	}, 10000)
})
