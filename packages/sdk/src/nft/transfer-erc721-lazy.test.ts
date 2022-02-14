import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Configuration, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi, NftOwnershipControllerApi } from "@rarible/ethereum-api-client"
import { randomAddress, toAddress } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { checkAssetType as checkAssetTypeTemplate } from "../order/check-asset-type"
import { getSendWithInjects } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { createErc721V3Collection } from "../common/mint"
import { checkChainId } from "../order/check-chain-id"
import { getEthereumConfig } from "../config"
import { signNft } from "./sign-nft"
import type { ERC721RequestV3 } from "./mint"
import { mint } from "./mint"
import type { TransferAsset } from "./transfer"
import { transfer } from "./transfer"
import { ERC721VersionEnum } from "./contracts/domain"
import { getErc721Contract } from "./contracts/erc721"

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
	const config = getEthereumConfig("e2e")
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)
	const send = getSendWithInjects().bind(null, gatewayApi, checkWalletChainId)
	const checkAssetType = checkAssetTypeTemplate.bind(null, nftCollectionApi)
	const sign = signNft.bind(null, ethereum, 17)


	test.skip("should transfer erc721 lazy token", async () => {
		const from = toAddress(wallet.getAddressString())
		const recipient = randomAddress()
		const contract = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")

		const request: ERC721RequestV3 = {
			uri: "ipfs://ipfs/hash",
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
			checkWalletChainId,
			request
		)

		const asset: TransferAsset = {
			tokenId: minted.tokenId,
			contract: contract,
		}

		const transferTx = await transfer(
			ethereum,
			send,
			checkAssetType,
			nftItemApi,
			nftOwnershipApi,
			checkWalletChainId,
			asset,
			recipient
		)
		await transferTx.wait()
		const erc721Lazy = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, contract)
		const recipientBalance = await erc721Lazy.functionCall("balanceOf", recipient).call()
		expect(recipientBalance).toEqual("1")
	})
})
