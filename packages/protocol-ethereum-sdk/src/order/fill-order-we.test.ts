import {
	toAddress,
	toBigNumber,
	toBinary, toWord,
	ZERO_ADDRESS,
} from "@rarible/types"
import {Web3Ethereum} from "@rarible/web3-ethereum"
import Web3 from "web3"
import {awaitAll, createGanacheProvider} from "@rarible/ethereum-sdk-test-common"
import {toBn} from "@rarible/utils/build/bn"
import {
	Address,
	Configuration,
	GatewayControllerApi,
	OrderControllerApi,
} from "@rarible/protocol-api-client"
import {Contract} from "web3-eth-contract"

import {EthereumContract} from "@rarible/ethereum-provider"
import {send as sendTemplate, sentTx} from "../common/send-transaction"
import {AbiItem} from "../common/abi-item"
import {deployTestErc20} from "./contracts/test/test-erc20"
import {deployTestErc721} from "./contracts/test/test-erc721"
// import {deployTransferProxy} from "./contracts/test/test-transfer-proxy"
import {deployErc20TransferProxy} from "./contracts/test/test-erc20-transfer-proxy"
import {deployTestExchangeV2} from "./contracts/test/test-exchange-v2"
import {deployTestRoyaltiesProvider} from "./contracts/test/test-royalties-provider"
import {fillOrderOpenSea, fillOrderSendTx, getRSV, matchOpenSeaV1Order, toVrs} from "./fill-order"
import {
	convertOpenSeaOrderToSignDTO, hashOpenSeaV1Order,
	hashOrder,
	SimpleOpenSeaV1Order,
} from "./sign-order"
import {deployTestErc1155} from "./contracts/test/test-erc1155"
import {getMakeFee} from "./get-make-fee"
import {approveErc20 as approveErc20Template} from "./approve-erc20"
import {deployTransferProxy} from "./contracts/test/test-transfer-proxy"
import {createOpenseaContract} from "./contracts/exchange-opensea-v1"
import {
	createOpenseaProxyRegistryEthContract,
	deployOpenseaProxyRegistry,
} from "./contracts/test/opensea/test-proxy-registry"
import {deployOpenseaTokenTransferProxy} from "./contracts/test/opensea/test-token-transfer-proxy"
import {deployOpenSeaExchangeV1} from "./contracts/test/opensea/test-exchange-opensea-v1"
import {createErc20Contract} from "./contracts/erc20"
import {invertOrder} from "./invert-order"

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
	let proxyAddress: Address
	let proxyAddress2: Address

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


		const grantAuth = await proxyRegistryEthContract
			.functionCall("grantInitialAuthentication", wyvernExchange.options.address)

		await send(grantAuth)

		const registerProxy = await proxyRegistryEthContract
			.functionCall("registerProxy")

		await send(registerProxy)

		proxyAddress = toAddress(
			await proxyRegistryEthContract.functionCall("proxies", sender1Address).call()
		)

		// wyvernProxyRegistry.registerProxy().withSender(userSender1).execute().awaitFirst()
		// val user1RegisteredProxy = wyvernProxyRegistry.proxies(userSender1.from()).awaitFirst()

		// token1.approve(wyvernTokenTransferProxy.address(), BigInteger.TEN.pow(10)).withSender(userSender1).execute().verifySuccess()
		// token1.approve(wyvernTokenTransferProxy.address(), BigInteger.TEN.pow(10)).withSender(userSender2).execute().verifySuccess()
		// token721.setApprovalForAll(user1RegisteredProxy, true).withSender(userSender1).execute().verifySuccess()

		// const proxyRegistryEthContract2 = await createOpenseaProxyRegistryEthContract(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		// const registerProxy2 = proxyRegistryEthContract2.functionCall("registerProxy")
		// await send(registerProxy2)
		//
		// proxyAddress2 = toAddress(
		// 	await proxyRegistryEthContract2.functionCall("proxies", sender2Address).call()
		// )
		console.log("proxyAddress", proxyAddress, "proxyAddress2", proxyAddress2)

		// await createErc20Contract(ethereum1, toAddress(it.testErc20.options.address))
		// 	.functionCall(
		// 		"approve",
		// 		wyvernTokenTransferProxy.options.address,
		// 		10000000000
		// 	)
		// 	.send()


		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender1Address,
		// })
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender2Address,
		// })

		await sentTx(it.testErc721.methods.setApprovalForAll(wyvernProxyRegistry.options.address, true), {
			from: sender1Address,
		})

		// await sentTx(it.testErc721.methods.setApprovalForAll(proxyAddress, true), {
		// 	from: sender2Address,
		// })


		// await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		// await sentTx(it.testErc721.methods.mint(sender2Address, 2, "0x"), { from: sender2Address })

		/*
		wyvernProxyRegistry.registerProxy().withSender(userSender1).execute().awaitFirst()
		wyvernProxyRegistry.registerProxy().withSender(userSender2).execute().awaitFirst()
		val user1RegisteredProxy = wyvernProxyRegistry.proxies(userSender1.from()).awaitFirst()
		val user2RegisteredProxy = wyvernProxyRegistry.proxies(userSender2.from()).awaitFirst()

		token1.approve(wyvernTokenTransferProxy.address(), BigInteger.TEN.pow(10)).withSender(userSender1).execute().verifySuccess()
		token1.approve(wyvernTokenTransferProxy.address(), BigInteger.TEN.pow(10)).withSender(userSender2).execute().verifySuccess()

		token721.setApprovalForAll(user1RegisteredProxy, true).withSender(userSender1).execute().verifySuccess()
		token721.setApprovalForAll(user2RegisteredProxy, true).withSender(userSender2).execute().verifySuccess()

		 */
		// await it.testErc20.methods.approve(
		// wyvernTokenTransferProxy.options.address,
		// 10000000000
		// )
		// 	.send({from: sender1Address})
	})


	const matchOrderLegacy = async (buy: any, sell: any, value?: any) => {
		const exchangeContract = await createOpenseaContract(ethereum1, toAddress(wyvernExchange.options.address))

		const buyHash = hashOrder(buy)
		const sellHash = hashOrder(sell)

		console.log("buyHash", buyHash)
		console.log("sellHash", sellHash)
		const buySignature = await web3.eth.sign(buyHash, sender1Address)
		// const buySigVrs = getRSV(buySignature)
		const buySigVrs = toVrs(buySignature)

		const sellSignature = await web3.eth.sign(sellHash, sender1Address)
		// const sellSigVrs = getRSV(sellSignature)
		const sellSigVrs = toVrs(sellSignature)

		/*
		console.log("before hash order")
		const hashres = await wyvernExchange.methods.hashOrder_(
			[buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken],
			[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt],
			buy.feeMethod,
			buy.side,
			buy.saleKind,
			buy.howToCall,
			buy.calldata,
			buy.replacementPattern,
			buy.staticExtradata)
			.call({from: sender1Address})

		console.log("after hasorrder", hashres, "buy hash", buyHash)

		const ordersCanMatch = await wyvernExchange.methods.ordersCanMatch_(
			[buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
			[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
			[buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall],
			buy.calldata,
			sell.calldata,
			buy.replacementPattern,
			sell.replacementPattern,
			buy.staticExtradata,
			sell.staticExtradata
		)
			.call({from: sender1Address})

		console.log("Orders match", ordersCanMatch)

		const orderMatchPrice = await wyvernExchange.methods.calculateMatchPrice_(
			[buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
			[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
			[buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall],
			buy.calldata,
			sell.calldata,
			buy.replacementPattern,
			sell.replacementPattern,
			buy.staticExtradata,
			sell.staticExtradata
		)
			.call({from: sender1Address})

		console.log("orderMatchPrice", orderMatchPrice)

		const approveBuy = exchangeContract.functionCall(
			"approveOrder_",
			[buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken],
			[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt],
			buy.feeMethod,
			buy.side,
			buy.saleKind,
			buy.howToCall,
			buy.calldata,
			buy.replacementPattern,
			buy.staticExtradata,
			true
		)

		const approveBuyOrder: any = await send(approveBuy)

		console.log("approveBuyOrder", approveBuyOrder)
		// console.log("approveBuyOrder tx", await approveBuyOrder["receipt"])

		const approveSell = await exchangeContract.functionCall(
			"approveOrder_",
			[sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
			[sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
			sell.feeMethod,
			sell.side,
			sell.saleKind,
			sell.howToCall,
			sell.calldata,
			sell.replacementPattern,
			sell.staticExtradata,
			true
		)

		const approveSellOrder: any = await send(approveSell)

		console.log("approveSellOrder", approveSellOrder)
		// console.log("approveSellOrder tx", await approveSellOrder.receipt)


		 */
		const orderTx = await exchangeContract.functionCall(
			"atomicMatch_",
			[buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
			[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
			[buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall],
			buy.calldata,
			sell.calldata,
			buy.replacementPattern,
			sell.replacementPattern,
			buy.staticExtradata,
			sell.staticExtradata,
			[buySigVrs.v, sellSigVrs.v],
			[buySigVrs.r, buySigVrs.s, sellSigVrs.r, sellSigVrs.s, "0x0000000000000000000000000000000000000000000000000000000000000000"],
			// {from: sender2Address, value: 0}
		)

		await send(orderTx, {value: value || 0})
	}

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
		target: proxyAddress,
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

	const matchOrder = async (buy: SimpleOpenSeaV1Order) => {
		const exchangeInstance = wyvernExchange

		// const atomicMatch: any = await send(orderTx, {value: value || 0})
		// const atomicMatch = {}
		const atomicMatch = await fillOrderSendTx(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			{
				openseaV1: toAddress(wyvernExchange.options.address),
				v2: toAddress(it.exchangeV2.options.address),
				v1: toAddress(it.exchangeV2.options.address),
			},
			orderApi,
			buy,
			{amount: 1}
		)

		// console.log("atomicMatch", atomicMatch)
		// console.log("atomicMatch tx", await atomicMatch.receipt)
		return atomicMatch
	}

	test("should allow proxy creation", async () => {
		const proxy = await wyvernProxyRegistry.methods.proxies(sender1Address)
			.call({from: sender1Address})
		expect(proxy).not.toBe(ZERO_ADDRESS)
	})

	test("proxy registry should have correct auth", async () => {
		const isProxyRegistryAuth = await proxyRegistryEthContract
			.functionCall("contracts", wyvernExchange.options.address)
			.call()

		expect(isProxyRegistryAuth).toBe(true)
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
				feeRecipient: toAddress(sender1Address),
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

		const orderHash = hashOpenSeaV1Order(leftOrder, toAddress(proxyAddress))

		const orderDTO = convertOpenSeaOrderToSignDTO(leftOrder)
		orderDTO.target = toAddress(proxyAddress)
		// orderDTO.taker = sender2Address

		const contractCalculatedHash = await exchangeContract
			.functionCall(
				"hashOrder_",
				[orderDTO.exchange, orderDTO.maker, orderDTO.taker, orderDTO.feeRecipient,
					orderDTO.target, orderDTO.staticTarget, orderDTO.paymentToken],
				[orderDTO.makerRelayerFee, orderDTO.takerRelayerFee, orderDTO.makerProtocolFee, orderDTO.takerProtocolFee,
					orderDTO.basePrice, orderDTO.extra, orderDTO.listingTime, orderDTO.expirationTime, orderDTO.salt],
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
				[buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
				[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
				[buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall],
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
				[buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
				[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
				[buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall],
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

	test("should allow simple order matching, second fee method, real maker protocol fees", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc721.methods.mint(sender1Address, 1, "0x"), { from: sender1Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("1"),
			},
			maker: sender1Address,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			taker: toAddress(sender1Address),
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


		console.log("it.testErc721.options.address", it.testErc721.options.address)
		console.log("it.testErc20.options.address", it.testErc20.options.address)
		// const buy = makeOrder(wyvernExchange.options.address, true)
		// const sell = makeOrder(wyvernExchange.options.address, false)

		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender1Address,
		// })
		// await sentTx(it.testErc20.methods.approve(it.erc20TransferProxy.options.address, toBn(100000)), {
		// 	from: sender1Address,
		// })
		//
		// await sentTx(it.testErc721.methods.setApprovalForAll(it.transferProxy.options.address, true), {
		// 	from: sender2Address,
		// })

		// const atomicMatch: any = await send(orderTx, {value: value || 0})

		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(10000)), {
		// 	from: sender1Address,
		// })

		// const atomicMatch = {}
		const atomicMatch = await fillOrderOpenSea(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			toAddress(wyvernExchange.options.address),
			toAddress(wyvernTokenTransferProxy.options.address),
			left,
			{amount: 5}
		)
	})

	test("should allow simple order matching with special-case Ether, nonzero price", async() => {
		const buy = makeOrder(wyvernExchange.options.address, true)
		const sell = makeOrder(wyvernExchange.options.address, false)
		sell.side = 1
		buy.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		sell.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		buy.basePrice = 100 as any
		sell.basePrice = 100 as any

		await matchOrderLegacy(buy, sell, 100)
	})


	test("should succeed with real token transfer", async () => {
		const buy = makeOrder(wyvernExchange.options.address, true)
		const sell = makeOrder(wyvernExchange.options.address, false)
		sell.side = 1
		sell.salt = 2
		buy.salt = 3

		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100)), {
		// 	from: sender1Address,
		// })

		buy.paymentToken = toAddress(it.testErc20.options.address)
		sell.paymentToken = toAddress(it.testErc20.options.address)
		buy.basePrice = toBigNumber("10")
		sell.basePrice = toBigNumber("10")

		console.log("last buy", JSON.stringify(buy, null, " "))
		console.log("last sell", JSON.stringify(sell, null, " "))

		await matchOrderLegacy(buy, sell)
	})

	test("should allow simple order matching with special-case Ether, nonzero fees, new fee method", async () => {
		const buy = makeOrder(wyvernExchange.options.address, false)
		const sell = makeOrder(wyvernExchange.options.address, true)
		sell.side = 1
		buy.feeMethod = 1
		sell.feeMethod = 1
		buy.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		sell.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		buy.basePrice = toBigNumber("10000")
		sell.basePrice = toBigNumber("10000")
		sell.makerProtocolFee = 100
		sell.makerRelayerFee = 100

		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender2Address,
		// })

		await matchOrderLegacy(buy, sell, 10000)
	})

	test("should allow simple order matching with special-case Ether, nonzero fees, new fee method, taker", async () => {
		const buy = makeOrder(wyvernExchange.options.address, false)
		const sell = makeOrder(wyvernExchange.options.address, true)

		sell.side = 1
		buy.feeMethod = 1
		sell.feeMethod = 1
		buy.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		sell.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		buy.basePrice = toBigNumber("10000")
		sell.basePrice = toBigNumber("10000")

		sell.takerProtocolFee = 100
		sell.takerRelayerFee = 100
		buy.takerProtocolFee = 100
		buy.takerRelayerFee = 100
		await matchOrderLegacy(buy, sell, 10200)
	})

	test("should allow simple order matching, second fee method", async () => {
		const buy = makeOrder(wyvernExchange.options.address, true)
		const sell = makeOrder(wyvernExchange.options.address, false)
		sell.side = 1
		buy.feeMethod = 1
		sell.feeMethod = 1
		buy.paymentToken = toAddress(it.testErc20.options.address)
		sell.paymentToken = toAddress(it.testErc20.options.address)
		await matchOrderLegacy(buy, sell)
	})


	test("should allow simple order matching with special-case Ether, nonzero fees, new fee method", async () => {
		await sentTx(it.testErc20.methods.mint(sender1Address, 1000), { from: sender1Address })
		await sentTx(it.testErc721.methods.mint(sender2Address, 2, "0x"), { from: sender2Address })

		const buy = makeOrder(wyvernExchange.options.address, true)
		const sell = makeOrder(wyvernExchange.options.address, false)
		sell.side = 1
		// buy.feeMethod = 1
		// sell.feeMethod = 1
		buy.target = proxyAddress
		sell.target = proxyAddress2
		buy.paymentToken = toAddress(it.testErc20.options.address)
		sell.paymentToken = toAddress(it.testErc721.options.address)
		buy.basePrice = 1
		sell.basePrice = 1
		//
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender1Address,
		// })
		//
		// await sentTx(it.testErc721.methods.setApprovalForAll(proxyAddress, true), {
		// 	from: sender2Address,
		// })

		await matchOrderLegacy(buy, sell)
	})
})
