import { toAddress, toBigNumber } from "@rarible/types"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/ethereum-api-client"
import { retry } from "../common/retry"
import type { ERC721RequestV3} from "../nft/mint"
import { mint } from "../nft/mint"
import { signNft } from "../nft/sign-nft"
import { getSendWithInjects } from "../common/send-transaction"
import { createErc721V3Collection } from "../common/mint"
import { getApiConfig } from "../config/api-config"
import { createTestProviders } from "../common/create-test-providers"
import { getEthereumConfig } from "../config"
import { checkAssetType as checkAssetTypeTemplate } from "./check-asset-type"
import { checkChainId } from "./check-chain-id"

const { provider, wallet } = createE2eProvider()
const { providers } = createTestProviders(provider, wallet)
const from = toAddress(wallet.getAddressString())

describe.each(providers)("check-asset-type test", ethereum => {
	const e2eErc721ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")
	const configuration = new Configuration(getApiConfig("e2e"))
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const sign = signNft.bind(null, ethereum, 17)
	const config = getEthereumConfig("e2e")
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)
	const send = getSendWithInjects().bind(null, gatewayApi, checkWalletChainId)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)

	test("should set assetClass if type not present", async () => {
		const request: ERC721RequestV3 = {
			uri: "ipfs://ipfs/hash",
			lazy: false,
			creators: [{ account: from, value: 10000 }],
			royalties: [],
			collection: createErc721V3Collection(e2eErc721ContractAddress),
		}
		const minted = await mint(
			ethereum,
			send,
			sign,
			nftCollectionApi,
			nftLazyMintApi,
			checkWalletChainId,
			request
		)

		const assetClass = await retry(10, 4000, async () => {
			const assetType = await checkAssetType({
				contract: e2eErc721ContractAddress,
				tokenId: toBigNumber(minted.tokenId),
			})
			if (assetType.assetClass !== "ERC721") {
				throw new Error("Asset type must be ERC721")
			}
			return assetType.assetClass
		})
		expect(assetClass).toEqual("ERC721")
	})

	test("should leave as is if assetClass present", async () => {
		const request: ERC721RequestV3 = {
			uri: "ipfs://ipfs/hash",
			creators: [{ account: from, value: 10000 }],
			royalties: [],
			lazy: false,
			collection: createErc721V3Collection(e2eErc721ContractAddress),
		}
		const minted = await mint(
			ethereum,
			send,
			sign,
			nftCollectionApi,
			nftLazyMintApi,
			checkWalletChainId,
			request
		)

		const assetType = await checkAssetType({
			assetClass: "ERC721",
			contract: e2eErc721ContractAddress,
			tokenId: toBigNumber(minted.tokenId),
		})
		expect(assetType.assetClass).toEqual("ERC721")
	})
})
