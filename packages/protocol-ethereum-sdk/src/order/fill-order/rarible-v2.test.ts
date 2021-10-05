import { randomAddress, randomWord, toAddress, toBigNumber } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils/build/bn"
import { sentTx, simpleSend } from "../../common/send-transaction"
import { E2E_CONFIG } from "../../config/e2e"
import { Config } from "../../config/type"
import { deployTestErc20 } from "../contracts/test/test-erc20"
import { deployTestErc721 } from "../contracts/test/test-erc721"
import { deployTransferProxy } from "../contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "../contracts/test/test-erc20-transfer-proxy"
import { deployTestExchangeV2 } from "../contracts/test/test-exchange-v2"
import { deployTestRoyaltiesProvider } from "../contracts/test/test-royalties-provider"
import { signOrder } from "../sign-order"
import { deployTestErc1155 } from "../contracts/test/test-erc1155"
import { SimpleOrder } from "../types"
import { RaribleV2OrderHandler } from "./rarible-v2"
import { OrderFiller } from "./index"

describe("fillOrder", () => {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const config: Config = E2E_CONFIG
	const v2Handler = new RaribleV2OrderHandler(ethereum1, simpleSend, config)
	const filler = new OrderFiller(ethereum1, null as any, v2Handler, null as any)

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
		config.exchange.v1 = toAddress(it.exchangeV2.options.address)
		config.exchange.v2 = toAddress(it.exchangeV2.options.address)
		config.chainId = 1
		config.fees.v2 = 100

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

		const signature = await signOrder(ethereum2, config, left)

		const finalOrder = { ...left, signature }
		const ab = await filler.fill({ order: finalOrder, amount: 2, payouts: [], originFees: [] })
		await ab.build().runAll()

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

		const signature = await signOrder(ethereum2, config, left)

		const before1 = toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call())
		const before2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call())

		const finalOrder = { ...left, signature }
		const originFees = [{
			account: randomAddress(),
			value: 100,
		}]
		const ab = await filler.fill({ order: finalOrder, amount: 2, originFees })
		await ab.build().runAll()

		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call()).toString()).toBe(
			before2.minus(2).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call()).toString()).toBe(
			before1.plus(2).toFixed()
		)
	})
})
