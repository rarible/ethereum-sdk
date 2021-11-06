import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber, toBinary } from "@rarible/types"
import type { OrderForm } from "@rarible/ethereum-api-client"
import { Configuration, OrderControllerApi } from "@rarible/ethereum-api-client"
import { getEthereumConfig } from "../config"
import { getApiConfig } from "../config/api-config"
import { retry } from "../common/retry"
import { cancel } from "./cancel"
import { signOrder } from "./sign-order"
import { UpsertOrder } from "./upsert-order"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { RaribleV2OrderHandler } from "./fill-order/rarible-v2"
import { OrderFiller } from "./fill-order"
import { RaribleV1OrderHandler } from "./fill-order/rarible-v1"

describe("cancel order", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const approve = () => Promise.resolve(undefined)
	const config = getEthereumConfig("e2e")
	const sign = signOrder.bind(null, ethereum, config)
	const configuration = new Configuration(getApiConfig("e2e"))
	const orderApi = new OrderControllerApi(configuration)

	const v1Handler = new RaribleV1OrderHandler(null as any, orderApi, null as any, config)
	const v2Handler = new RaribleV2OrderHandler(null as any, null as any, config)
	const orderService = new OrderFiller(null as any, v1Handler, v2Handler, null as any, null as any)

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
			checkLazyOrder,
			approve,
			sign,
			orderApi,
			ethereum
		)

		const order = await upserter.upsert.start({ order: form }).runAll()
		const tx = await cancel(checkLazyOrder, ethereum, config.exchange, order)
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
