import {
	Configuration,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
	OrderControllerApi,
	OrderForm,
} from "@rarible/protocol-api-client"
import { toBigNumber, toBinary, Word } from "@rarible/types"
import { toAddress } from "@rarible/types/build/address"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import fetch from "node-fetch"
import { EthereumContract } from "@rarible/ethereum-provider"
import { mint as mintTemplate } from "../nft/mint"
import { signNft as signNftTemplate } from "../nft/sign-nft"
import { createMintableTokenContract } from "../nft/contracts/erc721/mintable-token"
import { CONFIGS } from "../config"
import { toBn } from "../common/to-bn"
import { retry } from "../common/retry"
import { signOrder, SimpleOrder } from "./sign-order"
import { fillOrderSendTx } from "./fill-order"
import { getMakeFee } from "./get-make-fee"

describe("test exchange v1 order", () => {
	const { provider: provider1, wallet: wallet1 } = createE2eProvider()
	const {
		provider: provider2,
		wallet: wallet2,
	} = createE2eProvider("ded057615d97f0f1c751ea2795bc4b03bbf44844c13ab4f5e6fd976506c276b9")
	const web31 = new Web3(provider1)
	const web32 = new Web3(provider2)
	const ethereum1 = new Web3Ethereum({ web3: web31 })
	const ethereum2 = new Web3Ethereum({ web3: web32 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org", fetchApi: fetch })
	const orderApi = new OrderControllerApi(configuration)
	const itemApi = new NftItemControllerApi(configuration)
	const collectionApi = new NftCollectionControllerApi(configuration)
	const lazyMintApi = new NftLazyMintControllerApi(configuration)
	const signNft = signNftTemplate.bind(null, ethereum1, 17)
	const mint = mintTemplate.bind(null, ethereum1, signNft, collectionApi, lazyMintApi)

	const seller = toAddress(wallet1.getAddressString())
	const buyer = toAddress(wallet2.getAddressString())

	const erc721ContractAddress = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	let erc721contract: EthereumContract

	beforeAll(async () => {
		erc721contract = await createMintableTokenContract(ethereum1, erc721ContractAddress)
	})
	test("", async () => {
		const tokenId = await mint({
			"@type": "ERC721",
			contract: toAddress(erc721ContractAddress),
			uri: 'uri',
		})

		let order: OrderForm = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(erc721ContractAddress),
					tokenId: toBigNumber(tokenId),
				},
				value: toBigNumber("1"),
			},
			maker: seller,
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("1"),
			},
			salt: toBigNumber("10"),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 3,
			},
		}

		const leftSignature = await signOrder(ethereum1, {
			chainId: 17,
			exchange: CONFIGS.e2e.exchange,
		}, orderFormToSimpleOrder(order))

		order = { ...order, signature: leftSignature }

		await erc721contract.functionCall("setApprovalForAll", buyer, true).call()

		const hash = await fillOrderSendTx(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum2,
			CONFIGS.e2e.exchange,
			orderApi,
			// @ts-ignore
			order,
			{ amount: 1, payouts: [], originFees: [] },
		)
		
		await retry(10, async () => {
			const balanceOfBuyer = await itemApi.getNftItemById({ itemId: `${erc721ContractAddress}:${tokenId}` })
			expect(balanceOfBuyer.owners.find(o => o.toLowerCase() === buyer.toLowerCase())).toBe(buyer.toLowerCase())
		})
	}, 30000)
})


function fromSimpleOrderToOrderForm(order: SimpleOrder) {
	return { ...order, salt: toBigNumber(order.salt) } as OrderForm
}

function orderFormToSimpleOrder(form: OrderForm): SimpleOrder {
	return {
		...form,
		// @ts-ignore
		salt: toBinary(toBn(form.salt).toString(16)) as Word,
	}
}
