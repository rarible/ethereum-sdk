import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import fetch from "node-fetch"
import {
	Binary,
	Configuration,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { randomAddress, toAddress } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toBigNumber } from "@rarible/types/build/big-number"
import { signNft, SimpleLazyNft } from "./sign-nft"
import { mint, MintLazyRequest } from "./mint"
import { transferErc1155Lazy } from "./transfer-erc1155-lazy"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"

describe("transfer Erc721 lazy", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org", fetchApi: fetch })
	const nftOwnershipApi = new NftOwnershipControllerApi(configuration)
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintControllerApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)

	let sign: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>

	beforeAll(async () => {
		const chainId = await web3.eth.getChainId()
		sign = signNft.bind(null, ethereum, chainId)
	})

	test('should transfer erc1155 lazy token', async () => {
		const recipient = randomAddress()
		const contract = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")

		const mintNftTemplate: MintLazyRequest = {
			"@type": 'ERC1155',
			contract,
			uri: '//uri',
			creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
			royalties: [],
			supply: toBigNumber('100'),
			isLazy: true,
		}
		const tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintControllerApi, mintNftTemplate)
		const lazyNftItem = await nftItemApi.getNftLazyItemById({ itemId: tokenId })
		await transferErc1155Lazy(
			ethereum,
			sign,
			nftItemApi,
			nftOwnershipApi,
			{
				assetClass: "ERC1155_LAZY",
				tokenId: toBigNumber(tokenId),
				contract: lazyNftItem.contract,
				creators: lazyNftItem.creators,
				royalties: lazyNftItem.royalties,
			}, recipient, toBigNumber('50'))

		const erc1155Lazy = createErc1155LazyContract(ethereum, contract)
		const recipientBalance = await erc1155Lazy.functionCall("balanceOf", recipient, lazyNftItem.tokenId).call()
		expect(recipientBalance).toEqual("50")
	}, 10000)
//todo add test cases where we have partial lazyValue and value greater then 0 to use transferFromOrMint
})
