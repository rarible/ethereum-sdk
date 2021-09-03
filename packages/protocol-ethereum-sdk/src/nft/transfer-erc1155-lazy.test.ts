import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
	NftOwnershipControllerApi
} from "@rarible/protocol-api-client"
import { randomAddress, toAddress } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toBigNumber } from "@rarible/types/build/big-number"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { signNft } from "./sign-nft"
import { mint } from "./mint"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"
import { transfer } from "./transfer"

describe("transfer Erc721 lazy", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const nftOwnershipApi = new NftOwnershipControllerApi(configuration)
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintControllerApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftItemApi, nftCollectionApi)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(null, gatewayApi)

	test("should transfer erc1155 lazy token", async () => {
		const recipient = randomAddress()
		const contract = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")
		const tokenId = await mint(ethereum, send, sign, nftCollectionApi, nftLazyMintControllerApi, {
			collection: {
				type: "ERC1155",
				id: contract,
				supportsLazyMint: true,
			},
			uri: "//uri",
			creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
			royalties: [],
			supply: toBigNumber("100"),
			lazy: true,
		})
		await transfer(
			ethereum,
			send,
			sign,
			checkAssetType,
			nftItemApi,
			nftOwnershipApi,
			{
				tokenId: toBigNumber(tokenId),
				contract: contract,
			},
			recipient,
			toBigNumber("50")
		)

		const erc1155Lazy = createErc1155LazyContract(ethereum, contract)
		const recipientBalance = await erc1155Lazy.functionCall("balanceOf", recipient, tokenId).call()
		expect(recipientBalance).toEqual("50")
	}, 10000)
})
