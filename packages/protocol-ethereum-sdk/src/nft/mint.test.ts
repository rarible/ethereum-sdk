import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { EthereumContract } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types/build/address"
import {
	Binary,
	Configuration,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/protocol-api-client"
import fetch from "node-fetch"
import { toBigNumber } from "@rarible/types/build/big-number"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { signNft, SimpleLazyNft } from "./sign-nft"
import { mint } from "./mint"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"

describe("mint test", () => {
	const { provider, wallet } = createE2eProvider()
	const minter = toAddress(wallet.getAddressString())

	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3, from: minter })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org", fetchApi: fetch })
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)

	let contract: EthereumContract
	let sign: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>

	beforeAll(async () => {
		sign = signNft.bind(null, ethereum, await web3.eth.getChainId())
	})

	test("mint legacy Erc721", async () => {
		const mintableTokenE2eAddress = "0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21"

		await mint(
			ethereum,
			sign,
			nftCollectionApi,
			nftLazyMintApi,
			{
				"@type": "ERC721",
				contract: toAddress(mintableTokenE2eAddress),
				uri: 'uri',
			})
		const contract = createMintableTokenContract(ethereum, toAddress(mintableTokenE2eAddress))
		const balanceOfMinter = await contract.functionCall('balanceOf', minter).call()
		expect(balanceOfMinter).toBe("1")
	}, 20000)

	test("mint legacy Erc1155", async () => {
		const raribleTokenE2eAddress = "0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1"
		const uri = "test1155"
		const amount = 101
		const tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintApi, {
			"@type": "ERC1155",
			contract: toAddress(raribleTokenE2eAddress),
			uri,
			amount,
		})
		contract = createRaribleTokenContract(ethereum, toAddress(raribleTokenE2eAddress))
		const balanceOfMinter: string = await contract.functionCall('balanceOf', minter, tokenId).call()
		expect(balanceOfMinter).toBe(amount.toString())
	})

	test("mint lazy Erc721", async () => {
		const tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintApi, {
			"@type": "ERC721",
			contract: toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7"),
			uri: 'uri',
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			isLazy: true,
		})
		const resultNft = await nftItemApi.getNftItemById({ itemId: tokenId })
		expect(resultNft.lazySupply).toEqual('1')
	})

	test("mint lazy Erc1155", async () => {
		const tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintApi, {
			"@type": "ERC1155",
			contract: toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d"),
			uri: 'uri',
			supply: toBigNumber('100'),
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			isLazy: true,
		})
		const resultNft = await nftItemApi.getNftItemById({ itemId: tokenId })
		expect(resultNft.lazySupply).toEqual('100')
	})
})
