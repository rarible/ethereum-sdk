import { toAddress, toBigNumber } from "@rarible/types"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftLazyMintControllerApi } from "@rarible/protocol-api-client"
import { retry } from "../common/retry"
import { ERC721RequestV3, mint } from "../nft/mint"
import { signNft } from "../nft/sign-nft"
import { send as sendTemplate } from "../common/send-transaction"
import { createErc721V3Collection } from "../common/mint"
import { E2E_CONFIG } from "../config/e2e"
import { getApiConfig } from "../config/api-config"
import { createTestProviders } from "../common/create-test-providers"
import { checkAssetType as checkAssetTypeTemplate } from "./check-asset-type"

const { provider, wallet } = createE2eProvider()
const { providers } = createTestProviders(provider, wallet)
const from = toAddress(wallet.getAddressString())

describe.each(providers)("check-asset-type test", ethereum => {
	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const sign = signNft.bind(null, ethereum, 17)
	const send = sendTemplate.bind(null, gatewayApi)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)

	test("should set assetClass if type not present", async () => {
		const contract = E2E_CONFIG.nftContracts.erc721.v3
		const request: ERC721RequestV3 = {
			uri: "uri",
			lazy: false,
			creators: [{ account: from, value: 10000 }],
			royalties: [],
			collection: createErc721V3Collection(contract),
		}
		const minted = await mint(
			ethereum,
			send,
			sign,
			nftCollectionApi,
			nftLazyMintApi,
			request
		)

		await retry(10, async () => {
			const assetType = await checkAssetType({
				contract,
				tokenId: toBigNumber(minted.tokenId),
			})
			expect(assetType.assetClass).toEqual("ERC721")
		})
	})

	test("should leave as is if assetClass present", async () => {
		const contract = E2E_CONFIG.nftContracts.erc721.v3
		const request: ERC721RequestV3 = {
			uri: "uri",
			creators: [{ account: from, value: 10000 }],
			royalties: [],
			lazy: false,
			collection: createErc721V3Collection(contract),
		}
		const minted = await mint(
			ethereum,
			send,
			sign,
			nftCollectionApi,
			nftLazyMintApi,
			request
		)

		const assetType = await checkAssetType({
			assetClass: "ERC721",
			contract,
			tokenId: toBigNumber(minted.tokenId),
		})
		expect(assetType.assetClass).toEqual("ERC721")
	})
})
