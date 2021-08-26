import fetch from "node-fetch"
import { toAddress, toBigNumber } from "@rarible/types"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { EthereumContract } from "@rarible/ethereum-provider"
import {
	Binary,
	Configuration,
	NftCollection,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
} from "@rarible/protocol-api-client"
import { retry } from "../common/retry"
import { createErc721LazyContract } from "../nft/contracts/erc721/erc721-lazy"
import { checkAssetType } from "./check-asset-type"
import { isLazyErc721Collection, mint } from "../nft/mint"
import { signNft, SimpleLazyNft } from "../nft/sign-nft"


describe("check-asset-type test", function () {
	const { provider, wallet } = createE2eProvider()
	const from = toAddress(wallet.getAddressString())
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3, from })

	const e2eErc721ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org", fetchApi: fetch })
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const nftItemApi = new NftItemControllerApi(configuration)

	let testErc721: EthereumContract
	let sign: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>

	beforeAll(async () => {
		testErc721 = await createErc721LazyContract(ethereum, e2eErc721ContractAddress)
		sign = signNft.bind(null, ethereum, await web3.eth.getChainId())
	})

	test("should set assetClass if type not present", async () => {
		const tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintApi, {
			collection: { id: e2eErc721ContractAddress, type: "ERC721", supportsLazyMint: true },
			uri: 'uri',
			creators: [{ account: from, value: 10000 }],
			royalties: [],
		})

		await retry(10, async () => {
			const assetType = await checkAssetType(
				nftItemApi,
				nftCollectionApi,
				{
					contract: e2eErc721ContractAddress,
					tokenId: toBigNumber(tokenId),
				},
			)
			expect(assetType.assetClass).toEqual("ERC721")
		})
	}, 50000)

	test("should leave as is if assetClass present", async () => {
		const collection: Pick<NftCollection, "id" | "type" | "features"> = {
			id: toAddress(e2eErc721ContractAddress),
			type: "ERC721",
			features: ["MINT_AND_TRANSFER"],
		}
		let tokenId: string
		if (isLazyErc721Collection(collection)) {
			tokenId = await mint(ethereum, sign, nftCollectionApi, nftLazyMintApi, {
				collection,
				uri: 'uri',
				creators: [{ account: from, value: 10000 }],
				royalties: [],
			})
		} else {
			tokenId = ""
		}
		const assetType = await checkAssetType(
			nftItemApi,
			nftCollectionApi,
			{
				assetClass: 'ERC721',
				contract: e2eErc721ContractAddress,
				tokenId: toBigNumber(tokenId),
			},
		)
		expect(assetType.assetClass).toEqual("ERC721")
	}, 50000)

})
