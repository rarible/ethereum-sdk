import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi, NftOwnershipControllerApi } from "@rarible/protocol-api-client"
import { randomAddress, toAddress, toBigNumber } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { signNft } from "./sign-nft"
import { ERC1155RequestV2, mint } from "./mint"
import { transfer, TransferAsset } from "./transfer"
import { ERC1155VersionEnum } from "./contracts/domain"
import { getErc1155Contract } from "./contracts/erc1155"
import { createErc1155V2Collection } from "./test/mint"

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

		const request: ERC1155RequestV2 = {
			uri: "//uri",
			creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
			collection: createErc1155V2Collection(contract),
			royalties: [],
			supply: 100,
			lazy: true,
		}

		const minted = await mint(ethereum, send, sign, nftCollectionApi, nftLazyMintControllerApi, request)

		const asset: TransferAsset = {
			tokenId: minted.tokenId,
			contract: contract,
		}

		await transfer(
			ethereum,
			send,
			checkAssetType,
			nftItemApi,
			nftOwnershipApi,
			asset,
			recipient,
			toBigNumber("50")
		)

		const erc1155Lazy = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V2, contract)
		const recipientBalance = await erc1155Lazy.functionCall("balanceOf", recipient, minted.tokenId).call()
		expect(recipientBalance).toEqual("50")
	}, 10000)
})
