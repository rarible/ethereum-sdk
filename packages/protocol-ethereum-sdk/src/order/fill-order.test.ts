import {randomAddress, randomWord, toAddress, toBigNumber, ZERO_ADDRESS} from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils/build/bn"
import { Configuration, GatewayControllerApi, OrderControllerApi } from "@rarible/protocol-api-client"
import { send as sendTemplate, sentTx } from "../common/send-transaction"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { deployTransferProxy } from "./contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "./contracts/test/test-erc20-transfer-proxy"
import { deployTestExchangeV2 } from "./contracts/test/test-exchange-v2"
import { deployTestRoyaltiesProvider } from "./contracts/test/test-royalties-provider"
import { fillOrderSendTx } from "./fill-order"
import { signOrder, SimpleOrder } from "./sign-order"
import { deployTestErc1155 } from "./contracts/test/test-erc1155"
import { getMakeFee } from "./get-make-fee"

describe("fillOrder", () => {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(ethereum1, gatewayApi)

	let orderApi: OrderControllerApi

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		exchangeV2: deployTestExchangeV2(web3),
	})

	beforeAll(async () => {
		/**
		 * Configuring
		 */
		await sentTx(
			it.exchangeV2.methods.__ExchangeV2_init(
				toAddress(it.transferProxy.options.address),
				toAddress(it.erc20TransferProxy.options.address),
				toBigNumber("100"),
				sender1Address,
				toAddress(it.royaltiesProvider.options.address)
			),
			{ from: sender1Address }
		)
		await sentTx(it.transferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})
		await sentTx(it.erc20TransferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})
	})

	test("should match order(buy erc1155 for erc20)", async () => {
		//sender1 has ERC20, sender2 has ERC1155

		await sentTx(it.testErc20.methods.mint(sender1Address, 100), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 1, 10, "0x"), { from: sender1Address })

		const left: SimpleOrder = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("5"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			salt: randomWord(),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
		}

		await sentTx(it.testErc20.methods.approve(it.erc20TransferProxy.options.address, toBn(10)), {
			from: sender1Address,
		})

		await sentTx(it.testErc1155.methods.setApprovalForAll(it.transferProxy.options.address, true), {
			from: sender2Address,
		})

		const a = toAddress(it.exchangeV2.options.address)
		const signature = await signOrder(ethereum2, { chainId: 1, exchange: { v1: a, v2: a, openseaV1: toAddress(ZERO_ADDRESS) } }, left)

		await fillOrderSendTx(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			{ v2: toAddress(it.exchangeV2.options.address), v1: toAddress(it.exchangeV2.options.address), openseaV1: toAddress(ZERO_ADDRESS)},
			orderApi,
			{ ...left, signature },
			{ amount: 2, payouts: [], originFees: [] }
		)

		expect(toBn(await it.testErc20.methods.balanceOf(sender2Address).call()).toString()).toBe("4")
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call()).toString()).toBe("2")
	})

	test("should match order(buy erc1155 for eth)", async () => {
		//sender1 has ETH, sender2 has ERC1155

		await sentTx(it.testErc1155.methods.mint(sender2Address, 1, 10, "0x"), { from: sender1Address })

		const left: SimpleOrder = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("5"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("1000000"),
			},
			salt: randomWord(),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
		}

		await sentTx(it.testErc1155.methods.setApprovalForAll(it.transferProxy.options.address, true), {
			from: sender2Address,
		})

		const a = toAddress(it.exchangeV2.options.address)
		const signature = await signOrder(ethereum2, { chainId: 1, exchange: { v1: a, v2: a, openseaV1: toAddress(ZERO_ADDRESS)} }, left)

		const before1 = toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call())
		const before2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call())

		await fillOrderSendTx(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			{ v2: toAddress(it.exchangeV2.options.address), v1: toAddress(it.exchangeV2.options.address), openseaV1: toAddress(ZERO_ADDRESS) },
			orderApi,
			{ ...left, signature },
			{ amount: 2, payouts: [], originFees: [{ account: randomAddress(), value: 100 }] }
		)

		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call()).toString()).toBe(
			before2.minus(2).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call()).toString()).toBe(
			before1.plus(2).toFixed()
		)
	})
})
