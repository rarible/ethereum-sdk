import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import fetch from "node-fetch"
import {
	Binary,
	Configuration,
	NftCollection,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { randomAddress, toAddress } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toBigNumber } from "@rarible/types/build/big-number"
import { signNft, SimpleLazyNft } from "./sign-nft"
import { isLazyErc1155Collection, mint } from "./mint"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"
import { transfer } from "./transfer"
import { checkAssetType } from "../order/check-asset-type"

describe("transfer Erc721 lazy", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org", fetchApi: fetch })
	const nftOwnershipApi = new NftOwnershipControllerApi(configuration)
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintControllerApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)
	const checkAssetTypeImpl = checkAssetType.bind(null, nftItemApi, nftCollectionApi)

	let sign: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>

	beforeAll(async () => {
		const chainId = await web3.eth.getChainId()
		sign = signNft.bind(null, ethereum, chainId)
	})

	test('should transfer erc1155 lazy token', async () => {
		const recipient = randomAddress()
		const contract = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")
		const collection: Pick<NftCollection, "id" | "type" | "features"> = {
			type: "ERC1155",
			id: contract,
			features: ["MINT_WITH_ADDRESS"],
		}
		let tokenId: string
		if (isLazyErc1155Collection(collection)) {
			tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintControllerApi, {
				collection,
				uri: '//uri',
				creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
				royalties: [],
				supply: toBigNumber('100'),
				lazy: true,
			})
		} else {
			tokenId = ""
		}
		await transfer(
			ethereum,
			sign,
			checkAssetTypeImpl,
			nftItemApi,
			nftOwnershipApi,
			{
				tokenId: toBigNumber(tokenId),
				contract: contract,
			},
			recipient,
			toBigNumber('50'),
		)

		const erc1155Lazy = createErc1155LazyContract(ethereum, contract)
		const recipientBalance = await erc1155Lazy.functionCall("balanceOf", recipient, tokenId).call()
		expect(recipientBalance).toEqual("50")
	}, 10000)
})
