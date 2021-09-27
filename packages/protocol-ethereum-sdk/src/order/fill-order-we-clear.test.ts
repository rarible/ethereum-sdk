import {
	toAddress,
	toBigNumber,
	toBinary, toWord,
	ZERO_ADDRESS,
} from "@rarible/types"
import {Web3Ethereum} from "@rarible/web3-ethereum"
import Web3 from "web3"
import {awaitAll, createGanacheProvider} from "@rarible/ethereum-sdk-test-common"
import {
	Configuration,
	GatewayControllerApi,
	OrderControllerApi,
} from "@rarible/protocol-api-client"
import {Contract} from "web3-eth-contract"

import {EthereumContract} from "@rarible/ethereum-provider"
import {toBn} from "@rarible/utils/build/bn"
import {send as sendTemplate, sentTx} from "../common/send-transaction"
import {deployTestErc20} from "./contracts/test/test-erc20"
import {deployTestErc721} from "./contracts/test/test-erc721"
// import {deployTransferProxy} from "./contracts/test/test-transfer-proxy"
import {deployErc20TransferProxy} from "./contracts/test/test-erc20-transfer-proxy"
import {deployTestExchangeV2} from "./contracts/test/test-exchange-v2"
import {deployTestRoyaltiesProvider} from "./contracts/test/test-royalties-provider"
import {
	fillOrder,
	fillOrderOpenSea,
	fillOrderSendTx,
	getAtomicMatchArgAddresses, getAtomicMatchArgCommonData, getAtomicMatchArgUints, getRegisteredProxy,
	matchOpenSeaV1Order,
	toVrs,
} from "./fill-order"
import {
	convertOpenSeaOrderToSignDTO, getOrderSignature, hashOpenSeaV1Order,
	hashOrder,
	SimpleOpenSeaV1Order,
} from "./sign-order"
import {deployTestErc1155} from "./contracts/test/test-erc1155"
import {getMakeFee} from "./get-make-fee"
import {approveErc20 as approveErc20Template} from "./approve-erc20"
import {deployTransferProxy} from "./contracts/test/test-transfer-proxy"
import {createOpenseaContract} from "./contracts/exchange-opensea-v1"
import {deployOpenseaProxyRegistry} from "./contracts/test/opensea/test-proxy-registry"
import {deployOpenseaTokenTransferProxy} from "./contracts/test/opensea/test-token-transfer-proxy"
import {deployOpenSeaExchangeV1} from "./contracts/test/opensea/test-exchange-opensea-v1"
import {createErc20Contract} from "./contracts/erc20"
import {invertOrder} from "./invert-order"
import {createOpenseaProxyRegistryEthContract} from "./contracts/proxy-registry-opensea"

jest.setTimeout(60000)
describe("fillOrder", () => {
	const {addresses, provider} = createGanacheProvider()
	const [sender1Address, sender2Address] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({web3, from: sender1Address, gas: 1000000})
	const ethereum2 = new Web3Ethereum({web3, from: sender2Address, gas: 1000000})

	const configuration = new Configuration({basePath: "https://ethereum-api-e2e.rarible.org"})
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(ethereum1, gatewayApi)
	const approveErc20 = approveErc20Template.bind(null, ethereum1, send)

	let orderApi: OrderControllerApi

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		exchangeV2: deployTestExchangeV2(web3),

		// openseaProxyRegistry: deployOpenseaProxyRegistry(web3),
		// testToken: deployOpenseaTestToken(web3),
	})

	let wyvernExchange: Contract
	let wyvernProxyRegistry: Contract
	let wyvernTokenTransferProxy: Contract
	// let testToken: Contract
	let proxyRegistryEthContract: EthereumContract

	beforeAll(async () => {
		/**
         * Configuring
         */

		// testToken = await deployOpenseaTestToken(web3)
		wyvernProxyRegistry = await deployOpenseaProxyRegistry(web3)
		wyvernTokenTransferProxy = await deployOpenseaTokenTransferProxy(web3, wyvernProxyRegistry.options.address)

		wyvernExchange = await deployOpenSeaExchangeV1(
			web3,
			wyvernProxyRegistry.options.address,
			wyvernTokenTransferProxy.options.address,
			it.testErc20.options.address,
		)

		proxyRegistryEthContract = await createOpenseaProxyRegistryEthContract(ethereum1, toAddress(wyvernProxyRegistry.options.address))

		await proxyRegistryEthContract
			.functionCall("grantInitialAuthentication", wyvernExchange.options.address)
			.send()
	})

	test("should match order(resolve bid erc1155 for erc20)", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 5, 10, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					// assetClass: "ETH",
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			// maker: sender1Address,
			maker: sender1Address,
			take: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("5"),
				},
				value: toBigNumber("10"),
			},
			taker: ZERO_ADDRESS,
			// taker: sender2Address,
			salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			start: 1632432878,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(wyvernExchange.options.address),
				makerRelayerFee: toBigNumber("250"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("250"),
				takerProtocolFee: toBigNumber("250"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
				// side: "SELL",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0xf242432a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008508317a912086b921f6d2532f65e343c8140cc8ee5da6b5cdd5b5a22eceb75b84c7864573eb4fec000000000000010000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"),
				replacementPattern: toBinary("0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		// const proxyAddress = await getRegisteredProxy(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })
		// await sentTx(it.testErc1155.methods.setApprovalForAll(proxyAddress, true), { from: sender2Address })

		const signature = toBinary(await getOrderSignature(ethereum1, left))

		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 5).call())

		const filledOrder = await fillOrder(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum2,
			send,
			{} as any,
			(() => {}) as any,
			{
				exchange: {
					openseaV1: toAddress(wyvernExchange.options.address),
				},
				proxyRegistries: {
					openseaV1: toAddress(wyvernProxyRegistry.options.address),
				},
				transferProxies: {
					openseaV1: toAddress(wyvernTokenTransferProxy.options.address),
				},
			} as any,
			{
				...left,
				signature,
			},
			{amount: 10}
		)

		await filledOrder.build().runAll()

		// expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
		// 	initBalanceSender1.minus(10).toFixed()
		// )
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 5).call()).toString()).toBe(
			initBalanceSender2.minus(10).toFixed()
		)
	})


	test("should match order(resolve bid erc1155 for eth)", async () => {
		// await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 5, 10, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ETH",
					// assetClass: "ERC20",
					// contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			// maker: sender1Address,
			maker: sender1Address,
			take: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("5"),
				},
				value: toBigNumber("10"),
			},
			taker: ZERO_ADDRESS,
			// taker: sender2Address,
			salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			start: 1632432878,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(wyvernExchange.options.address),
				makerRelayerFee: toBigNumber("250"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("250"),
				takerProtocolFee: toBigNumber("250"),
				feeRecipient: toAddress(ZERO_ADDRESS),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
				// side: "SELL",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0xf242432a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008508317a912086b921f6d2532f65e343c8140cc8ee5da6b5cdd5b5a22eceb75b84c7864573eb4fec000000000000010000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"),
				replacementPattern: toBinary("0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		// const proxyAddress = await getRegisteredProxy(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })
		// await sentTx(it.testErc1155.methods.setApprovalForAll(proxyAddress, true), { from: sender2Address })

		const signature = toBinary(await getOrderSignature(ethereum1, left))

		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 5).call())

		const filledOrder = await fillOrder(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum2,
			send,
			{} as any,
			(() => {}) as any,
			{
				exchange: {
					openseaV1: toAddress(wyvernExchange.options.address),
				},
				proxyRegistries: {
					openseaV1: toAddress(wyvernProxyRegistry.options.address),
				},
				transferProxies: {
					openseaV1: toAddress(wyvernTokenTransferProxy.options.address),
				},
			} as any,
			{
				...left,
				signature,
			},
			{amount: 10}
		)

		await filledOrder.build().runAll()

		// expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
		// 	initBalanceSender1.minus(10).toFixed()
		// )
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 5).call()).toString()).toBe(
			initBalanceSender2.minus(10).toFixed()
		)
	})


	test("should fill order", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 3, 10, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("3"),
				},
				value: toBigNumber("1"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					// assetClass: "ERC20",
					assetClass: "ETH",
					// contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			start: 0,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(wyvernExchange.options.address),
				makerRelayerFee: toBigNumber("250"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("250"),
				takerProtocolFee: toBigNumber("250"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "SELL",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0xf242432a00000000000000000000000000d5cbc289e4b66a6252949d6eb6ebbb12df24ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"),
				replacementPattern: toBinary("0x000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		const proxyAddress = await getRegisteredProxy(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })
		await sentTx(it.testErc1155.methods.setApprovalForAll(proxyAddress, true), { from: sender2Address })

		const signature = toBinary(await getOrderSignature(ethereum2, left))

		const initBalanceSender1 = toBn(await it.testErc20.methods.balanceOf(sender1Address).call())
		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 3).call())

		const filledOrder = await fillOrder(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			{} as any,
			(() => {}) as any,
			{
				exchange: {
					openseaV1: toAddress(wyvernExchange.options.address),
				},
				proxyRegistries: {
					openseaV1: toAddress(wyvernProxyRegistry.options.address),
				},
				transferProxies: {
					openseaV1: toAddress(wyvernTokenTransferProxy.options.address),
				},
			} as any,
			{
				...left,
				signature,
			},
			{amount: 1}
		)

		await filledOrder.build().runAll()

		// expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
		// 	initBalanceSender1.minus(10).toFixed()
		// )
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 3).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})


})
