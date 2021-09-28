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
	cancelOrder,
	fillOrder,
	getAtomicMatchArgAddresses, getAtomicMatchArgCommonData, getAtomicMatchArgUints, getRegisteredProxy,
} from "./fill-order"
import {
	convertOpenSeaOrderToSignDTO, getOrderSignature, hashOpenSeaV1Order, hashToSign, SimpleOpenSeaV1Order,
} from "./sign-order"
import {deployTestErc1155} from "./contracts/test/test-erc1155"
import {getMakeFee} from "./get-make-fee"
import {approveErc20 as approveErc20Template} from "./approve-erc20"
import {deployTransferProxy} from "./contracts/test/test-transfer-proxy"
import {createOpenseaContract} from "./contracts/exchange-opensea-v1"
import {deployOpenseaProxyRegistry} from "./contracts/test/opensea/test-proxy-registry"
import {deployOpenseaTokenTransferProxy} from "./contracts/test/opensea/test-token-transfer-proxy"
import {deployOpenSeaExchangeV1} from "./contracts/test/opensea/test-exchange-opensea-v1"
import {createOpenseaProxyRegistryEthContract} from "./contracts/proxy-registry-opensea"

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

	const makeOrder = (exchange: any, isMaker: any): any => ({
		exchange: exchange,
		maker: sender1Address,
		taker: sender1Address,
		makerRelayerFee: "0",
		takerRelayerFee: "0",
		makerProtocolFee: "0",
		takerProtocolFee: "0",
		feeRecipient: isMaker ? sender1Address : "0x0000000000000000000000000000000000000000",
		feeMethod: "0",
		side: "0",
		saleKind: "0",
		target: ZERO_ADDRESS, //todo changed
		howToCall: "0",
		calldata: "0x",
		replacementPattern: "0x",
		staticTarget: "0x0000000000000000000000000000000000000000",
		staticExtradata: "0x",
		paymentToken: sender1Address,
		basePrice: "0",
		extra: "0",
		listingTime: "0",
		expirationTime: "0",
		salt: "0",
	})

	test("should calculate valid hash", async () => {
		const exchangeContract = createOpenseaContract(ethereum1, toAddress(wyvernExchange.options.address))

		const leftOrder: SimpleOpenSeaV1Order = {
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
			// taker: toAddress("0x0000000000000000000000000000000000000000"),
			salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			start: 1627563829,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(wyvernExchange.options.address),
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("0"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: ZERO_ADDRESS,
				// feeMethod: "SPLIT_FEE",
				feeMethod: "PROTOCOL_FEE",
				side: "SELL",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0x23b872dd00000000000000000000000047921676a46ccfe3d80b161c7b4ddc8ed9e716b60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a"),
				replacementPattern: toBinary("0x000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		const orderHash = hashOpenSeaV1Order(ethereum1, leftOrder)

		const orderDTO = convertOpenSeaOrderToSignDTO(ethereum1, leftOrder)

		const contractCalculatedHash = await exchangeContract
			.functionCall(
				"hashOrder_",
				getAtomicMatchArgAddresses(orderDTO),
				getAtomicMatchArgUints(orderDTO),
				orderDTO.feeMethod,
				orderDTO.side,
				orderDTO.saleKind,
				orderDTO.howToCall,
				orderDTO.calldata,
				orderDTO.replacementPattern,
				orderDTO.staticExtradata
			)
			.call()

		expect(orderHash).toBe(contractCalculatedHash)
	})

	test("should orders be matchable", async () => {
		const exchangeContract = await createOpenseaContract(ethereum1, toAddress(wyvernExchange.options.address))
		const buy = makeOrder(wyvernExchange.options.address, true)
		const sell = makeOrder(wyvernExchange.options.address, false)
		sell.side = 1

		const ordersCanMatch = await exchangeContract
			.functionCall(
				"ordersCanMatch_",
				[...getAtomicMatchArgAddresses(buy), ...getAtomicMatchArgAddresses(sell)],
				[...getAtomicMatchArgUints(buy), ...getAtomicMatchArgUints(sell)],
				[...getAtomicMatchArgCommonData(buy), ...getAtomicMatchArgCommonData(sell)],
				buy.calldata,
				sell.calldata,
				buy.replacementPattern,
				sell.replacementPattern,
				buy.staticExtradata,
				sell.staticExtradata
			)
			.call()

		expect(ordersCanMatch).toBe(true)
	})

	test("should order price be correct", async () => {
		const exchangeContract = await createOpenseaContract(ethereum1, toAddress(wyvernExchange.options.address))
		const buy = makeOrder(wyvernExchange.options.address, true)
		const sell = makeOrder(wyvernExchange.options.address, false)
		sell.side = 1

		const orderMatchPrice = await exchangeContract
			.functionCall(
				"calculateMatchPrice_",
				[...getAtomicMatchArgAddresses(buy), ...getAtomicMatchArgAddresses(sell)],
				[...getAtomicMatchArgUints(buy), ...getAtomicMatchArgUints(sell)],
				[...getAtomicMatchArgCommonData(buy), ...getAtomicMatchArgCommonData(sell)],
				buy.calldata,
				sell.calldata,
				buy.replacementPattern,
				sell.replacementPattern,
				buy.staticExtradata,
				sell.staticExtradata
			)
			.call()

		expect(buy.basePrice).toBe(orderMatchPrice)
	})

	/*
	test("should match order(buy erc721 for erc20)", async () => {

		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc721.methods.mint(sender2Address, 1, "0x"), { from: sender2Address })

		const proxyRegistryEthContractSender2 = await createOpenseaProxyRegistryEthContract(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		await proxyRegistryEthContractSender2
			.functionCall("registerProxy")
			.send()
		const proxyAddress = toAddress(await proxyRegistryEthContractSender2.functionCall("proxies", sender2Address).call())

		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })
		await sentTx(it.testErc721.methods.setApprovalForAll(proxyAddress, true), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("1"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
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
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("0"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "SELL",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0x23b872dd00000000000000000000000047921676a46ccfe3d80b161c7b4ddc8ed9e716b60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a"),
				replacementPattern: toBinary("0x000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
			signature: toBinary("0x584caf791d6e8d04b516c2b06e4d136a4e9d044ae2223177be6b6519202d9a4b757c45f0b38675f640765ba2c358e64969618785a7fa88531e58ba35c3ba246901"),
		}

		const initBalanceSender1 = toBn(await it.testErc20.methods.balanceOf(sender1Address).call())
		const initBalanceSender2 = toBn(await it.testErc721.methods.balanceOf(sender2Address).call())

		await fillOrderOpenSea(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			toAddress(wyvernExchange.options.address),
			left,
			{amount: 1}
		)

		expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
			initBalanceSender1.minus(10).toFixed()
		)
		expect(toBn(await it.testErc721.methods.balanceOf(sender2Address).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})


	test("should match order(buy erc1155 for erc20)", async () => {

		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 1, 10, "0x"), { from: sender2Address })

		const proxyRegistryEthContractSender2 = await createOpenseaProxyRegistryEthContract(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		await proxyRegistryEthContractSender2
			.functionCall("registerProxy")
			.send()
		const proxyAddress = toAddress(await proxyRegistryEthContractSender2.functionCall("proxies", sender2Address).call())

		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })
		await sentTx(it.testErc1155.methods.setApprovalForAll(proxyAddress, true), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("1"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
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
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("0"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "SELL",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0xf242432a000000000000000000000000ee5da6b5cdd5b5a22eceb75b84c7864573eb4fec0000000000000000000000000000000000000000000000000000000000000000ee5da6b5cdd5b5a22eceb75b84c7864573eb4fec000000000000030000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"),
				replacementPattern: toBinary("0x000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
			signature: toBinary("0x584caf791d6e8d04b516c2b06e4d136a4e9d044ae2223177be6b6519202d9a4b757c45f0b38675f640765ba2c358e64969618785a7fa88531e58ba35c3ba246901"),
		}

		const initBalanceSender1 = toBn(await it.testErc20.methods.balanceOf(sender1Address).call())
		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call())

		await fillOrderOpenSea(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			toAddress(wyvernExchange.options.address),
			left,
			{amount: 1}
		)

		expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
			initBalanceSender1.minus(10).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})


	 */
	test("should match order(buy erc1155 for eth)", async () => {

		await sentTx(it.testErc1155.methods.mint(sender2Address, 2, 10, "0x"), { from: sender2Address })
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("2"),
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
			salt: toWord("0x000000000000000000000000000000000000000000000000000000000000000a"),
			type: "OPEN_SEA_V1",
			start: 0,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(wyvernExchange.options.address),
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "SELL",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0x"),
				replacementPattern: toBinary("0x"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		const proxyAddress = await getRegisteredProxy(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		await sentTx(it.testErc1155.methods.setApprovalForAll(proxyAddress, true), { from: sender2Address })

		const signature = toBinary(await getOrderSignature(ethereum2, left))

		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 2).call())

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
				order: {...left, signature},
				amount: 1,
			},
		)

		await filledOrder.build().runAll()

		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 2).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})

	test("should fill order (sell erc1155 for erc20)", async () => {
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
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
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
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("0"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
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
				order: {...left, signature},
				amount: 1,
			}
		)

		await filledOrder.build().runAll()

		expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
			initBalanceSender1.minus(10).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 3).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})

	test("should fill order (sell erc1155 for erc20)", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 4, 10, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("4"),
				},
				value: toBigNumber("1"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
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
				feeRecipient: toAddress(sender2Address),
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
		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 4).call())

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
				order: {...left, signature},
				amount: 1,
			}
		)

		await filledOrder.build().runAll()

		expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
			initBalanceSender1.minus(10).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 4).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})

	test("should match buy order (buy erc1155 for erc20)", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 5, 10, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			maker: sender1Address,
			take: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("5"),
				},
				value: toBigNumber("1"),
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
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
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

		const initBalanceSender1 = toBn(await it.testErc20.methods.balanceOf(sender1Address).call())
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
				order: {...left, signature},
				amount: 1,
			}
		)

		await filledOrder.build().runAll()

		expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
			initBalanceSender1.minus(10).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 5).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})

	test("should match order(resolve bid erc1155 for eth)", async () => {
		// await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 6, 10, "0x"), { from: sender2Address })

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
					tokenId: toBigNumber("6"),
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

		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 6).call())

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
				order: {...left, signature},
				amount: 10,
			}
		)

		await filledOrder.build().runAll()

		// expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
		// 	initBalanceSender1.minus(10).toFixed()
		// )
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 6).call()).toString()).toBe(
			initBalanceSender2.minus(10).toFixed()
		)
	})

	test("should match order(resolve bid erc1155 for erc20)", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 7, 10, "0x"), { from: sender2Address })

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
					tokenId: toBigNumber("7"),
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

		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 7).call())

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
				order: {...left, signature},
				amount: 10,
			}
		)

		await filledOrder.build().runAll()

		// expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
		// 	initBalanceSender1.minus(10).toFixed()
		// )
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 7).call()).toString()).toBe(
			initBalanceSender2.minus(10).toFixed()
		)
	})

	test("should match buy order (buy erc721 for erc20)", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc721.methods.mint(sender2Address, 5, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			maker: sender1Address,
			take: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber("5"),
				},
				value: toBigNumber("1"),
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
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0xf242432a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008508317a912086b921f6d2532f65e343c8140cc8ee5da6b5cdd5b5a22eceb75b84c7864573eb4fec000000000000010000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"),
				replacementPattern: toBinary("0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })

		const signature = toBinary(await getOrderSignature(ethereum1, left))

		const initBalanceSender1 = toBn(await it.testErc20.methods.balanceOf(sender1Address).call())
		const initBalanceSender2 = toBn(await it.testErc721.methods.balanceOf(sender2Address).call())

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
				order: {...left, signature},
				amount: 1,
			}
		)

		await filledOrder.build().runAll()

		expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
			initBalanceSender1.minus(10).toFixed()
		)
		expect(toBn(await it.testErc721.methods.balanceOf(sender2Address).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})


	test("should match sell order(sell erc1155 on eth)", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 8, 10, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("8"),
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
		const initBalanceSender2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, 8).call())

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
				order: {...left, signature},
				amount: 1,
			}
		)

		await filledOrder.build().runAll()

		// expect(toBn(await it.testErc20.methods.balanceOf(sender1Address).call()).toString()).toBe(
		// 	initBalanceSender1.minus(10).toFixed()
		// )
		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 8).call()).toString()).toBe(
			initBalanceSender2.minus(1).toFixed()
		)
	})

	test("should cancel order", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc721.methods.mint(sender2Address, 6, "0x"), { from: sender2Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			maker: sender1Address,
			take: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber("6"),
				},
				value: toBigNumber("1"),
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
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(sender1Address),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0xf242432a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000008508317a912086b921f6d2532f65e343c8140cc8ee5da6b5cdd5b5a22eceb75b84c7864573eb4fec000000000000010000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"),
				replacementPattern: toBinary("0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, 100), { from: sender1Address })

		const signature = toBinary(await getOrderSignature(ethereum1, left))

		const orderHash = hashOpenSeaV1Order(ethereum2, left)
		const signedHash = hashToSign(orderHash)

		const cancel = await cancelOrder(
			ethereum1,
			{
				...left,
				signature,
			},
			toAddress(wyvernExchange.options.address)
		)

		const tx = await cancel.wait()

		const cancelEvent = tx.events.find(e => e.event === "OrderCancelled")

		expect(cancelEvent).toHaveProperty("args.hash", signedHash)

	})
})
