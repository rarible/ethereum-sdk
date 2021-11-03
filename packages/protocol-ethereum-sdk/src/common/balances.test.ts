import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import {
	Configuration, GatewayControllerApi,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/ethereum-api-client"
import { deployTestErc20 } from "../order/contracts/test/test-erc20"
import { deployTestErc721 } from "../order/contracts/test/test-erc721"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"
import { ERC1155RequestV2, ERC721RequestV3, mint as mintTemplate } from "../nft/mint"
import { signNft } from "../nft/sign-nft"
import { getApiConfig } from "../config/api-config"
import { Balances } from "./balances"
import { createErc1155V2Collection, createErc721V3Collection } from "./mint"
import { send as sendTemplate } from "./send-transaction"

describe("getBalance test", () => {
	const { addresses, provider } = createGanacheProvider()
	const [senderAddress] = addresses
	const web3 = new Web3(provider as any)
	const ethereum = new Web3Ethereum({ web3, from: senderAddress, gas: 1000000 })

	const sign = signNft.bind(null, ethereum, 17)
	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)

	const balances = new Balances(ethereum, nftItemApi)
	const send = sendTemplate.bind(null, gatewayApi)

	const e2eErc721V3ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const e2eErc1155V2ContractAddress = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")

	const mint = mintTemplate
		.bind(null, ethereum, send, sign, nftCollectionApi)
		.bind(null, nftLazyMintApi)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
	})

	test("get eth balance", async () => {
		const balance = await balances.getBalance(senderAddress, {assetClass: "ETH"})
		expect(balance).not.toBe("0")
	})

	test("get erc-20 balance", async () => {
		await it.testErc20.methods.mint(senderAddress, 100).send({ from: senderAddress, gas: 200000 })
		const balance = await balances.getBalance(senderAddress, {
			assetClass: "ERC20",
			contract: toAddress(it.testErc20.options.address),
		})
		expect(balance).toBe("100")
	})

	test("get erc-721 balance", async () => {
		await it.testErc721.methods.mint(senderAddress, 100, "").send({ from: senderAddress, gas: 200000 })
		const balance = await balances.getBalance(senderAddress, {
			assetClass: "ERC721",
			contract: toAddress(it.testErc721.options.address),
			tokenId: toBigNumber("100"),
		})

		expect(balance).toBe(await it.testErc721.methods.balanceOf(senderAddress).call())
	})

	test("get erc-721 v2 lazy token balance", async () => {
		const minted = await mint({
			collection: createErc721V3Collection(e2eErc721V3ContractAddress),
			uri: "uri",
			creators: [{ account: toAddress(senderAddress), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC721RequestV3)

		const balance = await balances.getBalance(senderAddress, {
			assetClass: "ERC721_LAZY",
			contract: e2eErc721V3ContractAddress,
			tokenId: minted.tokenId,
		})

		const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })

		expect(balance).toBe(resultNft.lazySupply)
	})

	test("get erc-1155 balance", async () => {
		await it.testErc1155.methods.mint(senderAddress, 100, 10, "0x").send({ from: senderAddress, gas: 200000 })
		const balance = await balances.getBalance(senderAddress, {
			assetClass: "ERC1155",
			contract: toAddress(it.testErc1155.options.address),
			tokenId: toBigNumber("100"),
		})

		expect(balance).toBe(await it.testErc1155.methods.balanceOf(senderAddress, 100).call())
	})

	test("get erc-1155 v2 lazy token balance", async () => {
		const minted = await mint({
			collection: createErc1155V2Collection(e2eErc1155V2ContractAddress),
			uri: "uri",
			supply: 100,
			creators: [{ account: toAddress(senderAddress), value: 10000 }],
			royalties: [],
			lazy: true,
		} as ERC1155RequestV2)

		const resultNft = await nftItemApi.getNftItemById({ itemId: minted.itemId })

		const balance = await balances.getBalance(senderAddress, {
			assetClass: "ERC1155_LAZY",
			contract: e2eErc1155V2ContractAddress,
			tokenId: minted.tokenId,
		})
		expect(balance).toBe(resultNft.lazySupply)
	})
})
