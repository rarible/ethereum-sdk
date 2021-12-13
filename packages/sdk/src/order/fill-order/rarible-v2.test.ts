import { randomAddress, randomWord, toAddress, toBigNumber } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { awaitAll } from "@rarible/ethereum-sdk-test-common"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common/build/create-ganache-provider"
import { toBn } from "@rarible/utils/build/bn"
import { Configuration, GatewayControllerApi } from "@rarible/ethereum-api-client"
import { send as sendTemplate, sentTx, simpleSend } from "../../common/send-transaction"
import { getEthereumConfig } from "../../config"
import { deployTestErc20 } from "../contracts/test/test-erc20"
import { deployTestErc721 } from "../contracts/test/test-erc721"
import { deployTransferProxy } from "../contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "../contracts/test/test-erc20-transfer-proxy"
import { deployTestExchangeV2 } from "../contracts/test/test-exchange-v2"
import { deployTestRoyaltiesProvider } from "../contracts/test/test-royalties-provider"
import { signOrder } from "../sign-order"
import { deployTestErc1155 } from "../contracts/test/test-erc1155"
import type { SimpleOrder } from "../types"
import { deployCryptoPunks } from "../../nft/contracts/cryptoPunks/deploy"
import { deployCryptoPunkTransferProxy } from "../contracts/test/test-crypto-punks-transfer-proxy"
import { deployCryptoPunkAssetMatcher } from "../contracts/test/test-crypto-punks-asset-matcher"
import { id } from "../../common/id"
import { approveErc20 } from "../approve-erc20"
import { getApiConfig } from "../../config/api-config"
import { RaribleV2OrderHandler } from "./rarible-v2"
import { OrderFiller } from "./index"

describe("buy & acceptBid orders", () => {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const config = getEthereumConfig("e2e")
	const v2Handler = new RaribleV2OrderHandler(ethereum1, simpleSend, config)
	const filler = new OrderFiller(ethereum1, null as any, v2Handler, null as any, null as any)
	const configuration = new Configuration(getApiConfig("e2e"))
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		exchangeV2: deployTestExchangeV2(web3),
		punksMarket: deployCryptoPunks(web3),
		punksTransferProxy: deployCryptoPunkTransferProxy(web3),
		punkAssetMatcher: deployCryptoPunkAssetMatcher(web3),
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
		config.transferProxies.cryptoPunks = toAddress(it.punksTransferProxy.options.address)
		config.transferProxies.erc20 = toAddress(it.erc20TransferProxy.options.address)
		config.chainId = 1
		config.fees.v2 = 100

		await sentTx(it.transferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})
		await sentTx(it.erc20TransferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})

		//Set transfer proxy for crypto punks
		await sentTx(
			it.exchangeV2.methods.setTransferProxy(
				id("CRYPTO_PUNKS"),
				it.punksTransferProxy.options.address
			),
			{from: sender1Address}
		)

		//Set asset matcher for crypto punks
		await sentTx(
			it.exchangeV2.methods.setAssetMatcher(
				id("CRYPTO_PUNKS"),
				it.punkAssetMatcher.options.address
			),
			{from: sender1Address}
		)

		await sentTx(it.punksMarket.methods.allInitialOwnersAssigned(), {from: sender1Address})

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
		await filler.buy({ order: finalOrder, amount: 2, payouts: [], originFees: [] })

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
		await filler.buy({ order: finalOrder, amount: 2, originFees })

		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call()).toString()).toBe(
			before2.minus(2).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call()).toString()).toBe(
			before1.plus(2).toFixed()
		)
	})

	test("should match order(buy erc1155 for eth) with dataType=V2", async () => {
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
				dataType: "RARIBLE_V2_DATA_V2",
				payouts: [],
				originFees: [],
				isMakeFill: true,
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
		await filler.buy({ order: finalOrder, amount: 2, originFees })

		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call()).toString()).toBe(
			before2.minus(2).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call()).toString()).toBe(
			before1.plus(2).toFixed()
		)
	})

	test("should fill order (buy) with crypto punks asset", async () => {
		const punkId = 43
		//Mint punks
		await sentTx(it.punksMarket.methods.getPunk(punkId), {from: sender2Address})
		await it.testErc20.methods.mint(sender1Address, 100).send({ from: sender1Address, gas: 200000 })

		const left: SimpleOrder = {
			make: {
				assetType: {
					assetClass: "CRYPTO_PUNKS",
					contract: toAddress(it.punksMarket.options.address),
					tokenId: punkId,
				},
				value: toBigNumber("1"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("1"),
			},
			salt: randomWord(),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
		}

		await sentTx(
			it.punksMarket.methods.offerPunkForSaleToAddress(
				punkId,
				0,
				toAddress(it.punksTransferProxy.options.address),
			),
			{from: sender2Address}
		)
		const signature = await signOrder(ethereum2, config, left)


		const finalOrder = { ...left, signature }
		await filler.buy({ order: finalOrder, amount: 1, originFees: []})

		const ownerAddress = await it.punksMarket.methods.punkIndexToAddress(punkId).call()

		expect(ownerAddress.toLowerCase()).toBe(sender1Address.toLowerCase())
	})

	test("should accept bid with crypto punks asset", async () => {
		const punkId = 50
		//Mint crypto punks
		await sentTx(it.punksMarket.methods.getPunk(punkId), {from: sender2Address})
		await it.testErc20.methods.mint(sender1Address, 100).send({ from: sender1Address, gas: 200000 })

		const tx = await approveErc20(
			ethereum1,
			send,
			toAddress(it.testErc20.options.address),
			toAddress(sender1Address),
			toAddress(it.erc20TransferProxy.options.address),
			toBigNumber("10")
		)
		await tx?.wait()

		const left: SimpleOrder = {
			maker: sender1Address,
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("1"),
			},
			take: {
				assetType: {
					assetClass: "CRYPTO_PUNKS",
					contract: toAddress(it.punksMarket.options.address),
					tokenId: punkId,
				},
				value: toBigNumber("1"),
			},
			salt: randomWord(),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
		}

		const signature = await signOrder(ethereum1, config, left)

		const finalOrder = { ...left, signature }

		const v2Handler = new RaribleV2OrderHandler(ethereum2, simpleSend, config)
		const filler = new OrderFiller(ethereum2, null as any, v2Handler, null as any, null as any)

		await filler.acceptBid({ order: finalOrder, amount: 1, originFees: []})

		const ownerAddress = await it.punksMarket.methods.punkIndexToAddress(punkId).call()

		expect(ownerAddress.toLowerCase()).toBe(sender1Address.toLowerCase())
	})

})
