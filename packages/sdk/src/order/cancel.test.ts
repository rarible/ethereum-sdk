import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber, toBinary } from "@rarible/types"
import type { OrderForm } from "@rarible/ethereum-api-client"
import { Configuration, OrderControllerApi } from "@rarible/ethereum-api-client"
import { deployTestErc20 } from "@rarible/ethereum-sdk-test-common"
import { deployTestErc721 } from "@rarible/ethereum-sdk-test-common"
import { getEthereumConfig } from "../config"
import { getApiConfig } from "../config/api-config"
import { delay, retry } from "../common/retry"
import { getSimpleSendWithInjects } from "../common/send-transaction"
import { createEthereumApis } from "../common/apis"
import { createRaribleSdk } from "../index"
import { createErc721V3Collection } from "../common/mint"
import { MintResponseTypeEnum } from "../nft/mint"
import { cancel } from "./cancel"
import { signOrder } from "./sign-order"
import { UpsertOrder } from "./upsert-order"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { OrderFiller } from "./fill-order"
import { checkChainId } from "./check-chain-id"
import { ItemType } from "./fill-order/seaport-utils/constants"
import { createSeaportOrder } from "./test/order-opensea"
import { awaitOrder } from "./test/await-order"
import { getOpenseaEthTakeData } from "./test/get-opensea-take-data"

describe.skip("cancel order", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const approve = () => Promise.resolve(undefined)
	const env = "testnet" as const
	const config = getEthereumConfig(env)
	const sign = signOrder.bind(null, ethereum, config)
	const configuration = new Configuration(getApiConfig(env))
	const orderApi = new OrderControllerApi(configuration)
	const apis = createEthereumApis(env)
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)

	const getBaseOrderFee = async () => 0
	const send = getSimpleSendWithInjects().bind(null, checkWalletChainId)
	const orderService = new OrderFiller(ethereum, send, config, apis, getBaseOrderFee)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
	})

	test("ExchangeV2 should work", async () => {
		const form: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			salt: toBigNumber("10") as any,
			maker: toAddress(wallet.getAddressString()),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
			signature: toBinary("0x"),
		}
		await testOrder(form)
	})

	test("ExchangeV1 should work", async () => {
		const form: OrderForm = {
			...TEST_ORDER_TEMPLATE,
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber("10"),
				},
				value: toBigNumber("10"),
			},
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			salt: toBigNumber("10") as any,
			maker: toAddress(wallet.getAddressString()),
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 0,
			},
			signature: toBinary("0x"),
		}
		await testOrder(form)
	})

	async function testOrder(form: OrderForm) {
		const checkLazyOrder = <T>(form: T) => Promise.resolve(form)
		const upserter = new UpsertOrder(
			orderService,
			send,
			checkLazyOrder,
			approve,
			sign,
			orderApi,
			ethereum,
			checkWalletChainId
		)

		const order = await upserter.upsert({ order: form })
		const tx = await cancel(checkLazyOrder, ethereum, send, config.exchange, checkWalletChainId, order)
		await tx.wait()

		const cancelledOrder = await retry(15, 2000, async () => {
			const current = await orderApi.getOrderByHash({ hash: order.hash })
			if (!current.cancelled) {
				throw new Error("Order is not cancelled")
			}
			return current
		})

		expect(cancelledOrder.cancelled).toEqual(true)
	}
})

describe.skip("test of cancelling seaport rinkeby order", () => {
	const { provider: providerSeller } = createE2eProvider("0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c", {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	})
	const web3Seller = new Web3(providerSeller as any)
	const ethereumSeller = new Web3Ethereum({ web3: web3Seller, gas: 1000000 })
	const sdkSeller = createRaribleSdk(ethereumSeller, "testnet")

	const rinkebyErc721V3ContractAddress = toAddress("0x6ede7f3c26975aad32a475e1021d8f6f39c89d82")

	const config = getEthereumConfig("testnet")

	const checkWalletChainId = checkChainId.bind(null, ethereumSeller, config)
	const send = getSimpleSendWithInjects().bind(null, checkWalletChainId)

	test("cancel seaport order", async () => {
		const accountAddressBuyer = toAddress(await ethereumSeller.getFrom())
		console.log("accountAddressBuyer", accountAddressBuyer)
		console.log("seller", await ethereumSeller.getFrom())

		const sellItem = await sdkSeller.nft.mint({
			collection: createErc721V3Collection(rinkebyErc721V3ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			royalties: [],
			lazy: false,
		})
		if (sellItem.type === MintResponseTypeEnum.ON_CHAIN) {
			await sellItem.transaction.wait()
		}

		await delay(10000)
		const make = {
			itemType: ItemType.ERC721,
			token: sellItem.contract,
			identifier: sellItem.tokenId,
		} as const
		const take = getOpenseaEthTakeData("10000000000")
		const orderHash = await createSeaportOrder(ethereumSeller, send, make, take)

		const order = await awaitOrder(sdkSeller, orderHash)

		const cancelTx = await sdkSeller.order.cancel(order)
		await cancelTx.wait()

		await retry(10, 3000, async () => {
			const order = await sdkSeller.apis.order.getOrderByHash({hash: orderHash})
			if (order.status !== "CANCELLED") {
				throw new Error("Order has not been cancelled")
			}
		})
	})
})

describe.skip("test of cancelling looksrare rinkeby order", () => {
	const { provider: providerSeller } = createE2eProvider("0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c", {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	})
	const web3Seller = new Web3(providerSeller as any)
	const ethereumSeller = new Web3Ethereum({ web3: web3Seller, gas: 1000000 })
	const sdkSeller = createRaribleSdk(ethereumSeller, "testnet")

	test("cancel seaport order", async () => {
		const orderHash = "0x924dd3b3421099ff58eefda2505c7ac8f33b3d579640198dea09dd4c4f5993e4"
		const order = await awaitOrder(sdkSeller, orderHash)
		const cancelTx = await sdkSeller.order.cancel(order)
		await cancelTx.wait()

		await retry(10, 3000, async () => {
			const order = await sdkSeller.apis.order.getOrderByHash({hash: orderHash})
			if (order.status !== "CANCELLED") {
				throw new Error("Order has not been cancelled")
			}
		})
	})
})
