import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { Configuration, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { E2E_CONFIG } from "../config/e2e"
import { getApiConfig } from "../config/api-config"
import { retry } from "../common/retry"
import { cancel } from "./cancel"
import { signOrder } from "./sign-order"
import { upsertOrder } from "./upsert-order"
import { TEST_ORDER_TEMPLATE } from "./test/order"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { RaribleV2OrderHandler } from "./fill-order/rarible-v2"
import { OrderFiller } from "./fill-order"
import { RaribleV1OrderHandler } from "./fill-order/rarible-v1"

const { provider, wallet } = createE2eProvider()
const web3 = new Web3(provider)
const ethereum = new Web3Ethereum({ web3 })
const approve = () => Promise.resolve(undefined)
const sign = signOrder.bind(null, ethereum, E2E_CONFIG)
const configuration = new Configuration(getApiConfig("e2e"))
const orderApi = new OrderControllerApi(configuration)

describe("cancel order", () => {
	const v1Handler = new RaribleV1OrderHandler(null as any, orderApi, null as any, E2E_CONFIG)
	const v2Handler = new RaribleV2OrderHandler(null as any, null as any, E2E_CONFIG)
	const orderService = new OrderFiller(null as any, v1Handler, v2Handler, null as any)

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
		}
		await testOrder(form)
	}, 15000)

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
		}
		await testOrder(form)
	})

	async function testOrder(form: OrderForm) {
		const checkLazyOrder = async () => Promise.resolve(form)
		const a = await upsertOrder(orderService, checkLazyOrder, approve, sign, orderApi, form)
		const order = await a.build().runAll()

		const tx = await cancel(ethereum, E2E_CONFIG.exchange, order)
		await tx.wait()

		await retry(15, async () => {
			const fetched = await orderApi.getOrderByHash({ hash: order.hash })
			expect(fetched.cancelled).toBe(true)
		})
	}
})
