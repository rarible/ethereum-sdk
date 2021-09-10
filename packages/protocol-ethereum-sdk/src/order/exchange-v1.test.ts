import {
	Configuration,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftLazyMintControllerApi,
	NftOwnershipControllerApi,
	OrderControllerApi,
	OrderForm
} from "@rarible/protocol-api-client"
import { toAddress, toBigNumber, toBinary } from "@rarible/types"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils/build/bn"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { CONFIGS } from "../config"
import { retry } from "../common/retry"
import { send as sendTemplate } from "../common/send-transaction"
import { signNft } from "../nft/sign-nft"
import { mint as mintTemplate } from "../nft/mint"
import { signOrder, SimpleOrder } from "./sign-order"
import { fillOrderSendTx } from "./fill-order"
import { getMakeFee } from "./get-make-fee"

describe("test exchange v1 order", () => {
	const { provider: provider1, wallet: wallet1 } = createE2eProvider()
	const { provider: provider2, wallet: wallet2 } = createE2eProvider(
		"ded057615d97f0f1c751ea2795bc4b03bbf44844c13ab4f5e6fd976506c276b9"
	)
	const web31 = new Web3(provider1)
	const web32 = new Web3(provider2)
	const ethereum1 = new Web3Ethereum({ web3: web31 })
	const ethereum2 = new Web3Ethereum({ web3: web32 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const orderApi = new OrderControllerApi(configuration)
	const ownershipApi = new NftOwnershipControllerApi(configuration)
	const nftCollectionApi = new NftCollectionControllerApi(configuration)
	const nftLazyMintApi = new NftLazyMintControllerApi(configuration)
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const sign = signNft.bind(null, ethereum1, 17)
	const mintHalfBind = mintTemplate.bind(null, ethereum1, send, sign, nftCollectionApi)
	const mint = mintHalfBind.bind(null, nftLazyMintApi)

	const seller = toAddress(wallet1.getAddressString())
	const buyer = toAddress(wallet2.getAddressString())

	const erc721ContractAddress = toAddress("0x22f8CE349A3338B15D7fEfc013FA7739F5ea2ff7")

	test("", async () => {
		const tokenId = await mint({
			collection: {
				id: erc721ContractAddress,
				type: "ERC721",
				supportsLazyMint: true,
			},
			uri: "uri",
			creators: [{ account: toAddress(seller), value: 10000 }],
			royalties: [],
		})

		let order: OrderForm = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: erc721ContractAddress,
					tokenId: toBigNumber(tokenId),
				},
				value: toBigNumber("1"),
			},
			maker: seller,
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("100000"),
			},
			salt: toBigNumber("10") as any,
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 3,
			},
		}

		const leftSignature = await signOrder(
			ethereum1,
			{
				chainId: 17,
				exchange: CONFIGS.e2e.exchange,
			},
			orderFormToSimpleOrder(order)
		)

		order = { ...order, signature: leftSignature }

		await fillOrderSendTx(getMakeFee.bind(null, { v2: 100 }), ethereum2, send, CONFIGS.e2e.exchange, orderApi, order, {
			amount: 1,
			payouts: [],
			originFees: [],
		})

		await retry(10, async () => {
			const ownership = await ownershipApi.getNftOwnershipById({
				ownershipId: `${erc721ContractAddress}:${tokenId}:${buyer}`,
			})
			expect(ownership.value).toBe("1")
		})
	}, 30000)
})

function orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
	return {
		...form,
		salt: toBinary(toBn(form.salt).toString(16)) as any,
	}
}
