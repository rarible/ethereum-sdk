import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress } from "@rarible/types"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { signNft } from "./sign-nft"
import { isErc1155v1Collection, isErc1155v2Collection, isErc721v1Collection, isErc721v2Collection, isErc721v3Collection, mint as mintTemplate, NftCollectionLike, prepareMintCollection } from "./mint"
import { deployErc721V1 } from "./contracts/erc721/deploy/v1"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc721Contract } from "./contracts/erc721"
import { getErc1155Contract } from "./contracts/erc1155"

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
		const contract = await deployErc721V1(web3, "Test", "ERC721V1")
		if (!contract.contractAddress) {
			throw new Error("No deployed contract")
		}
		const address = toAddress(contract.contractAddress)
		const raw: NftCollectionLike = {
			type: "ERC721",
			id: address,
			features: [],
		}
		const collection = prepareMintCollection(raw)
		if (isErc721v1Collection(collection)) {
			await mint({
				uri: "uri",
				collection,
			})
			const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V1, address)
			const balanceOfMinter = await contract.functionCall("balanceOf", minter).call()
			expect(balanceOfMinter).toBe("1")
		} else {
			throw new Error("Not an ERC721V1")
		}
	}, 20000)

	test("mint ERC-721 v2", async () => {
		const mintableTokenE2eAddress = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
		const raw: NftCollectionLike = {
			type: "ERC721",
			id: mintableTokenE2eAddress,
			features: ["SECONDARY_SALE_FEES"],
		}
		const collection = prepareMintCollection(raw)
		if (isErc721v2Collection(collection)) {
			await mint({
				uri: "uri",
				royalties: [],
				collection,
			})
			const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, mintableTokenE2eAddress)
			const balanceOfMinter = await contract.functionCall("balanceOf", minter).call()
			expect(balanceOfMinter).toBe("1")
		} else {
			throw new Error("Not an ERC721V2")
		}
	}, 20000)

	test("mint ERC-1155 v1", async () => {
		const raribleTokenE2eAddress = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")
		const uri = "test1155"
		const supply = 101
		const raw: NftCollectionLike = {
			type: "ERC1155",
			id: raribleTokenE2eAddress,
		}
		const collection = prepareMintCollection(raw)
		if (isErc1155v1Collection(collection)) {
			const minted = await mint({
				collection,
				uri,
				supply,
				royalties: [],
			})
			const contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, raribleTokenE2eAddress)
			const balanceOfMinter: string = await contract.functionCall("balanceOf", minter, minted.tokenId).call()
			expect(balanceOfMinter).toBe(supply.toString())
		} else {
			throw new Error("Not an ERC1155V1")
		}
	})

	test("mint ERC-721 v3", async () => {
		const raw: NftCollectionLike = {
			type: "ERC721",
			id: e2eErc721V3ContractAddress,
			features: ["MINT_AND_TRANSFER", "SECONDARY_SALE_FEES"],
		}
		const collection = prepareMintCollection(raw)
		if (isErc721v3Collection(collection)) {
			await mint({
				collection,
				uri: "uri",
				creators: [{ account: toAddress(minter), value: 10000 }],
				royalties: [],
				lazy: false,
			})
			const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, e2eErc721V3ContractAddress)
			const balanceOfMinter: string = await contract.functionCall("balanceOf", minter).call()
			expect(balanceOfMinter).toEqual("1")
		} else {
			throw new Error("Not an ERC721V3")
		}
	}, 10000)

	test("mint ERC-1155 v2", async () => {
		const raw: NftCollectionLike = {
			type: "ERC1155",
			id: e2eErc1155V2ContractAddress,
			features: ["MINT_AND_TRANSFER", "SECONDARY_SALE_FEES"],
		}
		const collection = prepareMintCollection(raw)
		if (isErc1155v2Collection(collection)) {
			const minted = await mint({
				collection,
				uri: "uri",
				supply: 100,
				creators: [{ account: toAddress(minter), value: 10000 }],
				royalties: [],
				lazy: false,
			})
			const contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V2, e2eErc1155V2ContractAddress)
			const balanceOfMinter: string = await contract.functionCall("balanceOf", minter, minted.tokenId).call()
			expect(balanceOfMinter).toEqual("100")
		} else {
			throw new Error("Not an ERC1155V2")
		}
	}, 10000)

	test("mint ERC-721 v3 lazy", async () => {
		const raw: NftCollectionLike = {
			type: "ERC721",
			id: e2eErc721V3ContractAddress,
			features: ["MINT_AND_TRANSFER", "SECONDARY_SALE_FEES"],
		}
		const collection = prepareMintCollection(raw)
		if (isErc721v3Collection(collection)) {
			const minted = await mint({
				collection,
				uri: "uri",
				creators: [{ account: toAddress(minter), value: 10000 }],
				royalties: [],
				lazy: true,
			})
			const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })
			expect(resultNft.lazySupply).toEqual("1")

			const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
			expect(lazy.uri).toBe("uri")
		} else {
			throw new Error("Not an ERC721V3")
		}
	}, 10000)

	test("mint ERC-1155 v2 lazy", async () => {
		const raw: NftCollectionLike = {
			type: "ERC1155",
			id: e2eErc1155V2ContractAddress,
			features: ["MINT_AND_TRANSFER", "SECONDARY_SALE_FEES"],
		}
		const collection = prepareMintCollection(raw)
		if (isErc1155v2Collection(collection)) {
			const minted = await mint({
				collection,
				uri: "uri",
				supply: 100,
				creators: [{ account: toAddress(minter), value: 10000 }],
				royalties: [],
				lazy: true,
			})
			const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })
			expect(resultNft.lazySupply).toEqual("100")

			const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
			expect(lazy.uri).toBe("uri")
		} else {
			throw new Error("Not an ERC1155V2")
		}
	}, 10000)
})
