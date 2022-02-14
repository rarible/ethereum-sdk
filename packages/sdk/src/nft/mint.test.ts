import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { toAddress } from "@rarible/types"
import type { Address } from "@rarible/ethereum-api-client"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/ethereum-api-client"
import { toBn } from "@rarible/utils"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { ethers } from "ethers"
import { EthersEthereum, EthersWeb3ProviderEthereum } from "@rarible/ethers-ethereum"
import Web3 from "web3"
import { getSendWithInjects } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { createErc1155V1Collection, createErc1155V2Collection, createErc721V1Collection, createErc721V2Collection, createErc721V3Collection } from "../common/mint"
import { checkChainId } from "../order/check-chain-id"
import { getEthereumConfig } from "../config"
import { signNft } from "./sign-nft"
import type { ERC1155RequestV1, ERC1155RequestV2, ERC721RequestV1, ERC721RequestV2, ERC721RequestV3} from "./mint"
import { mint as mintTemplate } from "./mint"
import { deployErc721V1 } from "./contracts/erc721/deploy/test/v1"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc721Contract } from "./contracts/erc721"
import { getErc1155Contract } from "./contracts/erc1155"

const { provider: provider1 } = createE2eProvider()
const { provider: provider2, wallet: wallet2 } = createE2eProvider()
const { provider: provider3 } = createE2eProvider()
const web3 = new Web3(provider1 as any)

const providers = [
	new Web3Ethereum({ web3 }),
	new EthersEthereum(
		new ethers.Wallet(wallet2.getPrivateKeyString(), new ethers.providers.Web3Provider(provider2 as any)),
	),
	new EthersWeb3ProviderEthereum(new ethers.providers.Web3Provider(provider3 as any)),
]

const configuration = new Configuration(getApiConfig("e2e"))
const nftCollectionApi = new NftCollectionControllerApi(configuration)
const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
const nftItemApi = new NftItemControllerApi(configuration)
const gatewayApi = new GatewayControllerApi(configuration)

const e2eErc721V3ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
const e2eErc1155V2ContractAddress = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")

describe.each(providers)("mint test", ethereum => {
	let minter: Address
	const config = getEthereumConfig("e2e")
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)

	beforeAll(async () => {
		minter = toAddress(await ethereum.getFrom())
	})

	const sign = signNft.bind(null, ethereum, 17)

	const send = getSendWithInjects().bind(null, gatewayApi, checkWalletChainId)

	const mint = mintTemplate
		.bind(null, ethereum, send, sign, nftCollectionApi)
		.bind(null, nftLazyMintApi, checkWalletChainId)

	test("mint ERC-721 v1", async () => {
		if (ethereum instanceof Web3Ethereum) { //todo enable for other providers
			const erc721v1 = await deployErc721V1(web3, "Test", "ERC721V1")
			const address = toAddress(erc721v1.options.address)
			const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V1, address)
			await contract.functionCall("setTokenURIPrefix", "ipfs:/").send()
			const result = await mint({
				uri: "ipfs://ipfs/hash",
				collection: createErc721V1Collection(address),
			} as ERC721RequestV1)
			const balanceOfMinter = toBn(await contract.functionCall("balanceOf", minter).call()).toFixed()
			const uri = await contract.functionCall("tokenURI", result.tokenId).call()
			expect(uri).toBe("ipfs://ipfs/hash")
			expect(balanceOfMinter).toBe("1")
		}
	})

	test("mint ERC-721 v2", async () => {
		const mintableTokenE2eAddress = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
		const result = await mint({
			uri: "ipfs://ipfs/hash",
			royalties: [{
				account: minter,
				value: 250,
			}],
			collection: createErc721V2Collection(mintableTokenE2eAddress),
		} as ERC721RequestV2)
		const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, mintableTokenE2eAddress)
		const balanceOfMinter = toBn(await contract.functionCall("balanceOf", minter).call()).toFixed()
		const uri = await contract.functionCall("tokenURI", result.tokenId).call()
		expect(uri).toBe("ipfs://ipfs/hash")
		expect(balanceOfMinter).toBe("1")
	})

	test("use provided nftTokenId", async () => {
		const collection = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
		const nftTokenId = await nftCollectionApi.generateNftTokenId({ collection, minter })
		const result = await mint({
			uri: "ipfs://ipfs/hash",
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
		const uri = "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5"
		const supply = 101
		const result = await mint({
			collection: createErc1155V1Collection(raribleTokenE2eAddress),
			uri,
			supply,
			royalties: [{
				account: minter,
				value: 250,
			}],
		} as ERC1155RequestV1)
		const contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V1, raribleTokenE2eAddress)
		const balanceOfMinter = toBn(await contract.functionCall("balanceOf", minter, result.tokenId).call()).toFixed()
		const readUri = await contract.functionCall("uri", result.tokenId).call()
		expect(readUri).toBe(uri)
		expect(balanceOfMinter).toBe(supply.toString())
	})

	test("mint ERC-721 v3", async () => {
		const result = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: false,
		} as ERC721RequestV3)
		const contract = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, e2eErc721V3ContractAddress)
		const balanceOfMinter = toBn(await contract.functionCall("balanceOf", minter).call()).toFixed()
		const uri = await contract.functionCall("tokenURI", result.tokenId).call()
		expect(uri).toBe("ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5")
		expect(balanceOfMinter).toEqual("1")
	})

	test("mint ERC-1155 v2", async () => {
		const minted = await mint({
			collection: createErc1155V2Collection(e2eErc1155V2ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			supply: 100,
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: false,
		} as ERC1155RequestV2)
		const contract = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V2, e2eErc1155V2ContractAddress)
		const balanceOfMinter = toBn(await contract.functionCall("balanceOf", minter, minted.tokenId).call()).toFixed()
		const uri = await contract.functionCall("uri", minted.tokenId).call()
		expect(uri).toBe("ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5")
		expect(balanceOfMinter).toEqual("100")
	})

	test.skip("mint ERC-721 v3 lazy", async () => {
		const minted = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC721RequestV3)
		const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })
		expect(resultNft.lazySupply).toEqual("1")

		const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
		expect(lazy.uri).toBe("/ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5")
	})

	test.skip("mint ERC-1155 v2 lazy", async () => {
		const minted = await mint({
			collection: createErc1155V2Collection(e2eErc1155V2ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			supply: 100,
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC1155RequestV2)
		const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })
		expect(resultNft.lazySupply).toEqual("100")

		const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
		expect(lazy.uri).toBe("/ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5")
	})
})
