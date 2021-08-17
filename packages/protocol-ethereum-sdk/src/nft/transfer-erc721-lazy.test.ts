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
import { CONFIGS } from "../config"
import { signNft, SimpleLazyNft } from "./sign-nft"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"

describe("transfer Erc721", () => {
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

	test('should transfer erc721 lazy token', async () => { // todo use transfer-erc721-lazy function
		const recipient = randomAddress()
		const { tokenId } = await nftCollectionApi.generateNftTokenId({
				collection: toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7"),
				minter: toAddress(wallet.getAddressString()),
			},
		)

		const nftTemplate: SimpleLazyNft<"signatures"> = {
			["@type"]: 'ERC721',
			contract: toAddress(CONFIGS.e2e.transferProxies.erc721Lazy),
			tokenId: tokenId,
			uri: '//uri',
			creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
			royalties: [],
		}


		const signature = await sign(nftTemplate)

		const params = [
			{
				tokenId: nftTemplate.tokenId,
				creators: nftTemplate.creators,
				royalties: nftTemplate.royalties,
				uri: nftTemplate.uri,
				signatures: [signature],
			},
			wallet.getAddressString(),
			recipient,
		]
		const erc721Lazy = createErc721LazyContract(ethereum, toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7"))
		await erc721Lazy.functionCall("transferFromOrMint", ...params).send()
		const recipientBalance = await erc721Lazy.functionCall("balanceOf", recipient).call()

		expect(recipientBalance).toEqual(1)
	})

})
