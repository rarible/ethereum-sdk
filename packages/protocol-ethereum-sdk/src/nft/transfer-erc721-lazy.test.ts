import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi, NftOwnershipControllerApi } from "@rarible/protocol-api-client"
import { randomAddress, toAddress } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { signNft } from "./sign-nft"
import { ERC721RequestV3, mint } from "./mint"
import { transfer, TransferAsset } from "./transfer"
import { ERC721VersionEnum } from "./contracts/domain"
import { getErc721Contract } from "./contracts/erc721"
import { createErc721V3Collection } from "./test/mint"

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
	const send = sendTemplate.bind(null, gatewayApi)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)
	const sign = signNft.bind(null, ethereum, 17)

	test("should transfer erc721 lazy token", async () => {
		const from = toAddress(wallet.getAddressString())
		const recipient = randomAddress()
		const contract = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")

		const request: ERC721RequestV3 = {
			uri: "//uri",
			creators: [{ account: from, value: 10000 }],
			royalties: [],
			lazy: true,
			collection: createErc721V3Collection(contract),
		}

		const minted = await mint(
			ethereum,
			send,
			sign,
			nftCollectionApi,
			nftLazyMintControllerApi,
			request
		)

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
			recipient
		)
		const erc721Lazy = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, contract)
		const recipientBalance = await erc721Lazy.functionCall("balanceOf", recipient).call()
		expect(recipientBalance).toEqual("1")
	}, 30000)
})
