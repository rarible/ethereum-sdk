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
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"
import { transfer } from "./transfer"

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

	test('should transfer erc721 lazy token', async () => {
		const from = toAddress(wallet.getAddressString())
		const recipient = randomAddress()
		const contract = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")

		const mintNftTemplate: MintLazyRequest = {
			"@type": 'ERC721',
			contract,
			uri: '//uri',
			creators: [{ account: from, value: 10000 }],
			royalties: [],
			isLazy: true,
		}
		const tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintControllerApi, mintNftTemplate)
		await transfer(
			ethereum,
			sign,
			nftItemApi,
			nftOwnershipApi,
			{
				tokenId: toBigNumber(tokenId),
				contract: contract,
			},
			recipient,
		)
		const erc721Lazy = createErc721LazyContract(ethereum, contract)
		const recipientBalance = await erc721Lazy.functionCall("balanceOf", recipient).call()
		expect(recipientBalance).toEqual("1")
	}, 30000)

})
