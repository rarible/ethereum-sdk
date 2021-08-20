import {
	BigNumber,
	Binary,
	Configuration,
	NftCollectionControllerApi,
	NftItemControllerApi,
	OrderControllerApi,
	OrderForm,
	SignatureForm,
} from "@rarible/protocol-api-client"
import { Address, randomAddress, toBigNumber, toBinary } from "@rarible/types"
import { toAddress } from "@rarible/types/build/address"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import fetch from "node-fetch"
import { Ethereum, EthereumContract } from "@rarible/ethereum-provider"
import { createExchangeV1Contract, EXCHANGEV1_E2E_ADDRESS } from "./contracts/exchange-v1"
import { toLegacyAssetType } from "./to-legacy-asset-type"
import { abi } from "./abi"
import { signOrder as signOrderTemplate, SimpleOrder } from "./sign-order"
import { checkLazyOrder as checkLazyOrderTemplate } from "./check-lazy-order"
import { approve as approveTemplate } from "./approve"
import { checkAssetType as checkAssetTypeTemplate } from "./check-asset-type"
import { CONFIGS } from "../config"
import { sentTx } from "../common/send-transaction"
import { createErc721Contract } from "./contracts/erc721"

type LegacyAssetType = {
	assetType: number,
	token: Address,
	tokenId: BigNumber
}

type OrderV1Struct = {
	key: {
		owner: Address,
		salt: string,
		sellAsset: LegacyAssetType,
		buyAsset: LegacyAssetType,
	},
	selling: string,
	buying: string,
	sellerFee: string
}

type ExchangeV1Request = {
	order: {
		key: {
			owner: Address
			salt: string
			sellAsset: {
				token: Address
				tokenId: string
				assetType: string
			}
			buyAsset: {
				token: Address
				tokenId: string
				assetType: string
			}
		},
		selling: string
		buying: string
		sellerFee: string
	}
	sig: SignatureForm,
	buyerFee: string
	buyerFeeSig: SignatureForm
	amount: number
	buyer: Address
}
describe("test exchange v1 order", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org", fetchApi: fetch })
	const orderApi = new OrderControllerApi(configuration)
	const itemApi = new NftItemControllerApi(configuration)
	const collectionApi = new NftCollectionControllerApi(configuration)
	const checkAssetType = checkAssetTypeTemplate.bind(null, itemApi, collectionApi)
	const checkLazyOrder = checkLazyOrderTemplate.bind(null, checkAssetType)
	const approve = approveTemplate.bind(null, ethereum, CONFIGS.e2e.transferProxies)
	const signOrder = signOrderTemplate.bind(null, ethereum, { chainId: 17, exchange: CONFIGS.e2e.exchange })


	const buyer = randomAddress()
	const seller = toAddress(wallet.getAddressString())

	const erc721ContractAddress = toAddress("0x268dF35c389Aa9e1ce0cd83CF8E5752b607dE90d")
	let erc721contract: EthereumContract

	beforeAll(async () => {
		erc721contract = await createErc721Contract(ethereum, erc721ContractAddress)
	})
	test("", async () => {
		await sentTx(it.testErc1155.methods.mint(sender2Address, 1, 10, "0x"), { from: sender1Address })
		erc721contract.functionCall("mint", seller,)
		let order: OrderForm = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(testErc721.options.address),
					tokenId: toBigNumber("10"),
				},
				value: toBigNumber("1"),
			},
			maker: seller,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			salt: toBigNumber("10"),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 3,
			},
		}
		const leftSignature = await sign(ethereum, order)
		order = { ...order, signature: leftSignature }

		const exchangeAddress = toAddress(EXCHANGEV1_E2E_ADDRESS)
		const exchangeContract = createExchangeV1Contract(ethereum, exchangeAddress)

		const buyerFee = 5
		const buyerFeeSig = await orderApi.buyerFeeSignature({
			fee: buyerFee,
			orderForm: order,
		})

		console.log('buyerFeeSig', buyerFeeSig)
		//await exchangeContract.functionCall("prepareBuyerFeeMessage", prepared, buyerFee).call()
		debugger
		const amount = order.take.value
		const prepared = orderToStruct(order)
		const params = [prepared, toVrs(order?.signature?.substring(2) as Binary), buyerFee, toVrs(buyerFeeSig.substring(2)), amount, buyer]
		console.log(params)
		const tx = await exchangeContract.functionCall(
			"exchange",
			...params,
		).send()
		console.log(tx.hash)
		const receipt = await web3.eth.getTransactionReceipt(tx.hash)
		console.log('receipt', receipt)
	}, 30000)
})

function orderToStruct(order: OrderForm): OrderV1Struct {
	return {
		key: {
			owner: order.maker,
			salt: order.salt,
			sellAsset: toLegacyAssetType(order.make.assetType),
			buyAsset: toLegacyAssetType(order.take.assetType),
		},
		selling: order.make.value,
		buying: order.take.value,
		// @ts-ignore
		sellerFee: order.data.fee,
	}
}

function toVrs(sig: string) {
	const sig0 = sig
	const r = "0x" + sig0.substring(0, 64)
	const s = "0x" + sig0.substring(64, 128)
	const v = parseInt(sig0.substring(128, 130), 16)
	return { r, v, s }
}

const ASSET = {
	"token": "address",
	"tokenId": "uint256",
	"assetType": "uint8",
}
const ORDER = {
	"key": {
		"owner": "address",
		"salt": "uint256",
		"sellAsset": ASSET,
		"buyAsset": ASSET,
	},
	"selling": "uint256",
	"buying": "uint256",
	"sellerFee": "uint256",
}

async function sign(ethereum: Ethereum, order: OrderForm) {
	const legacyHash = hashLegacyOrder(order)
	return toBinary(await ethereum.personalSign(legacyHash.substring(2)))
}

export function hashLegacyOrder(order: OrderForm): string {
	if (order.type !== "RARIBLE_V1") {
		throw new Error(`Not supported type: ${order.type}`)
	}
	const data = order.data
	if (data.dataType !== "LEGACY") {
		throw new Error(`Not supported data type: ${data.dataType}`)
	}

	const makeType = toLegacyAssetType(order.make.assetType)
	const takeType = toLegacyAssetType(order.take.assetType)

	const struct = {
		key: {
			owner: order.maker,
			salt: order.salt,
			sellAsset: makeType,
			buyAsset: takeType,
		},
		selling: order.make.value,
		buying: order.take.value,
		sellerFee: data.fee,
	}

	return Web3.utils.sha3(abi.encodeParameter({ "Order": ORDER }, struct)) as string
}

function fromSimpleOrderToOrderForm(order: SimpleOrder) {
	return { ...order, salt: toBigNumber(order.salt) } as OrderForm
}
