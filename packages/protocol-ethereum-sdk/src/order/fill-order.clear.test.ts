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
import {
	createTestOpenSeaExchangeV1Contract,
	deployOpenSeaExchangeV1,
} from "./contracts/test/opensea/test-exchange-opensea-v1"
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

		// await deployer.deploy(TestToken)
		// setConfig("deployed." + network + ".TestToken", TestToken.address)
		// await deployer.deploy(TestDAO, TestToken.address)
		// setConfig('deployed.' + network + '.TestDAO', TestDAO.address)
		// await deployer.deploy(TestStatic)
		// setConfig('deployed.' + network + '.TestStatic', TestStatic.address)

		// file 3
		// console.log('--file 3')
		// await deployer.deploy(MerkleProof)
		// console.log('MerkleProof', MerkleProof)
		// setConfig('deployed.' + network + '.MerkleProof', MerkleProof.address)
		// await deployer.link(MerkleProof, WyvernToken)
		// await deployer.deploy(WyvernToken, utxoMerkleRoot, utxoAmount)
		// setConfig('deployed.' + network + '.WyvernToken', WyvernToken.address)
		// await deployer.deploy(WyvernDAO, WyvernToken.address)
		// setConfig('deployed.' + network + '.WyvernDAO', WyvernDAO.address)
		// const wyvernTokenInstance = await WyvernToken.deployed()
		// const daoInstance = await WyvernDAO.deployed()
		// wyvernTokenInstance.releaseTokens.sendTransaction(daoInstance.address)
		// wyvernTokenInstance.releaseTokens(daoInstance.address)

		// file 4
		// console.log('--file 4')
		// await deployer.deploy(WyvernDAOProxy)
		// setConfig('deployed.' + network + '.WyvernDAOProxy', WyvernDAOProxy.address)
		// await deployer.deploy(WyvernAtomicizer)
		// setConfig('deployed.' + network + '.WyvernAtomicizer', WyvernAtomicizer.address)

		// current file

		// console.log('tokenInstance', tokenInstance)

		// const accounts = exchange.contract._eth.accounts
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

		// const proxyRegistryEthContract2 = await createOpenseaProxyRegistryEthContract(ethereum2, toAddress(wyvernProxyRegistry.options.address))
		// const registerProxy2 = proxyRegistryEthContract2.functionCall("registerProxy")
		// await send(registerProxy2)

		// proxyAddress2 = toAddress(
		// 	await proxyRegistryEthContract2.functionCall("proxies", sender2Address).call()
		// )


		// await createErc20Contract(ethereum1, toAddress(it.testErc20.options.address))
		// 	.functionCall(
		// 		"approve",
		// 		wyvernTokenTransferProxy.options.address,
		// 		10000000000
		// 	)
		// 	.send()


		// wyvernProxyRegistry.registerProxy().withSender(userSender1).execute().awaitFirst()
		// val user1RegisteredProxy = wyvernProxyRegistry.proxies(userSender1.from()).awaitFirst()
		//
		// token1.approve(wyvernTokenTransferProxy.address(), BigInteger.TEN.pow(10)).withSender(userSender1).execute().verifySuccess()
		// token1.approve(wyvernTokenTransferProxy.address(), BigInteger.TEN.pow(10)).withSender(userSender2).execute().verifySuccess()
		// token2.approve(wyvernTokenTransferProxy.address(), BigInteger.TEN.pow(10)).withSender(userSender2).execute().verifySuccess()
		// token721.setApprovalForAll(user1RegisteredProxy, true).withSender(userSender1).execute().verifySuccess()

		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender1Address,
		// })
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender2Address,
		// })

		await sentTx(it.testErc721.methods.setApprovalForAll(proxyAddress, true), {
			from: sender1Address,
		})

		await sentTx(it.testErc721.methods.setApprovalForAll(proxyAddress, true), {
			from: sender2Address,
		})
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
		arg1
		0x5206e78b21Ce315ce284FB24cf05e0585A93B1d9 - exchange addr
		0x8508317a912086b921F6D2532f65e343C8140Cc8 - buyer
		0xEE5DA6b5cDd5b5A22ECEB75b84C7864573EB4FeC - taker
		0x0000000000000000000000000000000000000000 - feeRecipient
		0x88B48F654c30e99bc2e4A1559b4Dcf1aD93FA656 - buy target
		0x0000000000000000000000000000000000000000 - staticTarget
		0x0000000000000000000000000000000000000000 - payment token
		0x5206e78b21Ce315ce284FB24cf05e0585A93B1d9 - sell exchange
		0xEE5DA6b5cDd5b5A22ECEB75b84C7864573EB4FeC - sell maker
		0x0000000000000000000000000000000000000000 - sell taker
		0x5b3256965e7C3cF26E11FCAf296DfC8807C01073 - sell fee recipient
		0x88B48F654c30e99bc2e4A1559b4Dcf1aD93FA656 - sell target
		0x0000000000000000000000000000000000000000 - static target
		0x0000000000000000000000000000000000000000 - payment token

		arg2
		250 buy - makerRelayerFee
		0 takerRelayerFee
		0 makerProtocolFee
		0 takerProtocolFee
		100000000000000 - basePrice (0.0001)
		0 extra
		1632221454 listing time
		0 - buy expiration time
		74483134188892290309968157186523667317676209717488307602850737348175901816409 buy salt
		250 - SELL make relayer fee
		0 sell taker relayer fee
		0 sell - maker protocol fee
		0 - taker protocol fee
		100000000000000 sell - baseprice
		0 - extra
		1632218114 - listing time
		0 - expiration time
		71925507778432069468439121120565826332852409374117248822110073253002328788308 salt

		arg3
		1 - BUY - feeMethod
		0 - side (0 - buy)
		0 - saleKind
		0 - howTocall
		1 - SELL - feeMethod
		1 - side (1 - sell)
		0 - sell - saleKind
		0 - sell.howToCall
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

		const approveTx = await send(orderTx, {value: value || 0})
		console.log("approveTx", approveTx)
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

	test("should allow simple order matching, second fee method", async () => {
		// console.log("proxy", proxy)
		const buy = makeOrder(wyvernExchange.options.address, true)
		const sell = makeOrder(wyvernExchange.options.address, false)
		sell.side = 1
		sell.basePrice = 100
		buy.basePrice = 100
		buy.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		sell.paymentToken = toAddress("0x0000000000000000000000000000000000000000")
		// buy.feeMethod = 1
		// sell.feeMethod = 1
		// buy.paymentToken = toAddress(it.testErc20.options.address)
		// sell.paymentToken = toAddress(it.testErc20.options.address)
		await matchOrderLegacy(buy, sell, 100)
	})


	test("should allow simple order", async () => {
		await sentTx(it.testErc721.methods.mint(sender1Address, 1, "0x"), { from: sender1Address })
		// await sentTx(it.testErc20.methods.mint(sender2Address, 1000), { from: sender2Address })

		console.log("sender1Address - sell", sender1Address)
		console.log("sender2Address - buy", sender2Address)
		// const target = it.testErc721.options.address
		const target = proxyAddress
		const buy = makeOrder(wyvernExchange.options.address, false)
		const sell = makeOrder(wyvernExchange.options.address, true)
		// sell.side = 1
		// buy.feeMethod = 1
		// sell.feeMethod = 1
		// buy.paymentToken = toAddress(it.testErc20.options.address)
		// buy.basePrice = 1
		buy.maker = sender2Address
		buy.taker = sender1Address
		buy.feeRecipient = ZERO_ADDRESS
		buy.target = target
		buy.paymentToken = toAddress(ZERO_ADDRESS)
		buy.side = 0
		buy.basePrice = 100
		buy.feeMethod = 0
		// buy.paymentToken =
		// buy

		// sell.paymentToken = toAddress(it.testErc721.options.address)
		// sell.paymentToken = toAddress(it.testErc721.options.address)
		// sell.basePrice = 1
		sell.maker = sender1Address
		sell.taker = toAddress(ZERO_ADDRESS)
		sell.feeRecipient = toAddress(sender1Address)
		sell.paymentToken = toAddress(ZERO_ADDRESS)
		sell.target = target
		sell.side = 1
		sell.basePrice = 100
		sell.feeMethod = 0
		//
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, toBn(100000)), {
		// 	from: sender2Address,
		// })
		//
		// await sentTx(it.testErc721.methods.setApprovalForAll(proxyAddress, true), {
		// 	from: sender1Address,
		// })
		//
		// await sentTx(it.testErc721.methods.setApprovalForAll(proxyAddress, true), {
		// 	from: sender2Address,
		// })

		console.log("buy order", JSON.stringify(buy, null, "	"))
		console.log("sell order", JSON.stringify(sell, null, "	"))

		console.log("atomic order source", [buy.exchange, buy.maker, buy.taker, buy.feeRecipient, buy.target, buy.staticTarget, buy.paymentToken, sell.exchange, sell.maker, sell.taker, sell.feeRecipient, sell.target, sell.staticTarget, sell.paymentToken],
			[buy.makerRelayerFee, buy.takerRelayerFee, buy.makerProtocolFee, buy.takerProtocolFee, buy.basePrice, buy.extra, buy.listingTime, buy.expirationTime, buy.salt, sell.makerRelayerFee, sell.takerRelayerFee, sell.makerProtocolFee, sell.takerProtocolFee, sell.basePrice, sell.extra, sell.listingTime, sell.expirationTime, sell.salt],
			[buy.feeMethod, buy.side, buy.saleKind, buy.howToCall, sell.feeMethod, sell.side, sell.saleKind, sell.howToCall],
			buy.calldata,
			sell.calldata,
			buy.replacementPattern,
			sell.replacementPattern,
			buy.staticExtradata,
			sell.staticExtradata,)

		// const approveBuyOrder: any = await send(approveBuy)

		await matchOrderLegacy(buy, sell, 100)
	})


})
