import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi, NftOwnershipControllerApi } from "@rarible/protocol-api-client"
import { randomAddress, toAddress, toBigNumber } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { signNft } from "./sign-nft"
import { mint } from "./mint"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"
import { transfer } from "./transfer"
import { createErc1155MintRequest } from "./mint-utils"

describe("transfer Erc721 lazy", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })

	const configuration = new Configuration(getApiConfig("e2e"))
	const nftOwnershipApi = new NftOwnershipControllerApi(configuration)
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintControllerApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(null, gatewayApi)

	test("should transfer erc1155 lazy token", async () => {
		const recipient = randomAddress()
		const contract = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")

		const request = createErc1155MintRequest({
			uri: "//uri",
			creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
			royalties: [],
			supply: toBigNumber("100"),
			lazy: true,
		}, contract)

		const minted = await mint(ethereum, send, sign, nftCollectionApi, nftLazyMintControllerApi, request)
		await transfer(
			ethereum,
			send,
			sign,
			checkAssetType,
			nftItemApi,
			nftOwnershipApi,
			{
				tokenId: minted.nftTokenId.tokenId,
				contract: contract,
			},
			recipient,
			toBigNumber("50")
		)

		const erc1155Lazy = createErc1155LazyContract(ethereum, contract)
		const recipientBalance = await erc1155Lazy.functionCall("balanceOf", recipient, minted.nftTokenId.tokenId).call()
		expect(recipientBalance).toEqual("50")
	}, 10000)
})
