import { toAddress, toBigNumber } from "@rarible/types"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { retry } from "../common/retry"
import { mint } from "../nft/mint"
import { signNft } from "../nft/sign-nft"
import { createErc721MintRequest } from "../nft/mint-utils"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { checkAssetType as checkAssetTypeTemplate } from "./check-asset-type"

describe("check-asset-type test", function () {
	const { provider, wallet } = createE2eProvider()
	const from = toAddress(wallet.getAddressString())
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3, from })

	const e2eErc721ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(null, gatewayApi)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)

	test("should set assetClass if type not present", async () => {
		const props = {
			uri: "uri",
			creators: [{ account: from, value: 10000 }],
			royalties: [],
		}
		const minted = await mint(
			ethereum,
			send,
			sign,
			nftCollectionApi,
			nftLazyMintApi,
			createErc721MintRequest(props, e2eErc721ContractAddress)
		)

		await retry(10, async () => {
			const assetType = await checkAssetType({
				contract: e2eErc721ContractAddress,
				tokenId: toBigNumber(minted.nftTokenId.tokenId),
			})
			expect(assetType.assetClass).toEqual("ERC721")
		})
	}, 50000)

	test("should leave as is if assetClass present", async () => {
		const props = {
			uri: "uri",
			creators: [{ account: from, value: 10000 }],
			royalties: [],
		}
		const minted = await mint(
			ethereum,
			send,
			sign,
			nftCollectionApi,
			nftLazyMintApi,
			createErc721MintRequest(props, e2eErc721ContractAddress)
		)

		const assetType = await checkAssetType({
			assetClass: "ERC721",
			contract: e2eErc721ContractAddress,
			tokenId: toBigNumber(minted.nftTokenId.tokenId),
		})
		expect(assetType.assetClass).toEqual("ERC721")
	}, 50000)
})
