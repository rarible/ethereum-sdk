import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/protocol-api-client"
import { send as sendTemplate } from "../common/send-transaction"
import { createRaribleTokenContract } from "./contracts/erc1155/rarible-token"
import { signNft } from "./sign-nft"
import { mint as mintTemplate } from "./mint"
import { createMintableTokenContract } from "./contracts/erc721/mintable-token"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"

describe("mint test", () => {
	const { provider, wallet } = createE2eProvider()
	const minter = toAddress(wallet.getAddressString())

	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3, from: minter })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const sign = signNft.bind(null, ethereum, 17)
	const mintHalfBind = mintTemplate.bind(null, ethereum, send, sign, nftCollectionApi)
	const mint = mintHalfBind.bind(null, nftLazyMintApi)

	const e2eErc721ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const e2eErc1155ContractAddress = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")

	test("mint legacy Erc721", async () => {
		const mintableTokenE2eAddress = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
		await mint({
			collection: { id: mintableTokenE2eAddress, type: "ERC721", supportsLazyMint: false },
			uri: "uri",
			royalties: [],
		})
		const contract = createMintableTokenContract(ethereum, toAddress(mintableTokenE2eAddress))
		const balanceOfMinter = await contract.functionCall("balanceOf", minter).call()
		expect(balanceOfMinter).toBe("1")
	}, 20000)

	test("mint legacy Erc1155", async () => {
		const raribleTokenE2eAddress = toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1")
		const uri = "test1155"
		const supply = 101
		const tokenId = await mint({
			collection: { id: raribleTokenE2eAddress, type: "ERC1155", supportsLazyMint: false },
			uri,
			supply,
			royalties: [],
		})

		const contract = createRaribleTokenContract(ethereum, toAddress(raribleTokenE2eAddress))
		const balanceOfMinter: string = await contract.functionCall("balanceOf", minter, tokenId).call()
		expect(balanceOfMinter).toBe(supply.toString())
	})

	test("mint with new contract Erc721", async () => {
		await mint({
			collection: {
				id: e2eErc721ContractAddress,
				type: "ERC721",
				supportsLazyMint: true,
			},
			uri: "uri",
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
		})

		const contract = createErc721LazyContract(ethereum, toAddress(e2eErc721ContractAddress))
		const balanceOfMinter: string = await contract.functionCall("balanceOf", minter).call()
		expect(balanceOfMinter).toEqual("1")
	}, 10000)

	test("mint with new contract Erc1155", async () => {
		const tokenId = await mint({
			collection: {
				id: toAddress(e2eErc1155ContractAddress),
				type: "ERC1155",
				supportsLazyMint: true,
			},
			uri: "uri",
			supply: toBigNumber("100"),
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
		})

		const contract = createErc1155LazyContract(ethereum, toAddress(e2eErc1155ContractAddress))
		const balanceOfMinter: string = await contract.functionCall("balanceOf", minter, tokenId).call()
		expect(balanceOfMinter).toEqual("100")
	}, 10000)

	test("mint lazy Erc721", async () => {
		const tokenId = await mint({
			collection: {
				id: toAddress(e2eErc721ContractAddress),
				type: "ERC721",
				supportsLazyMint: true,
			},
			uri: "uri",
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: true,
		})
		const resultNft = await nftItemApi.getNftItemById({ itemId: `${e2eErc721ContractAddress}:${tokenId}` })
		expect(resultNft.lazySupply).toEqual("1")

		const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
		expect(lazy.uri).toBe("uri")
	}, 10000)

	test("mint lazy Erc1155", async () => {
		const tokenId = await mint({
			collection: {
				id: toAddress(e2eErc1155ContractAddress),
				type: "ERC1155",
				supportsLazyMint: true,
			},
			uri: "uri",
			supply: toBigNumber("100"),
			creators: [{ account: toAddress(minter), value: 10000 }],
			royalties: [],
			lazy: true,
		})

		const resultNft = await nftItemApi.getNftItemById({ itemId: `${e2eErc1155ContractAddress}:${tokenId}` })
		expect(resultNft.lazySupply).toEqual("100")

		const lazy = await nftItemApi.getNftLazyItemById({ itemId: resultNft.id })
		expect(lazy.uri).toBe("uri")
	}, 10000)
})
