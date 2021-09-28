import {awaitAll, createGanacheProvider} from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import {Web3Ethereum} from "@rarible/web3-ethereum"
import {Address, Asset, Configuration, GatewayControllerApi, OrderControllerApi} from "@rarible/protocol-api-client"
import {Contract} from "web3-eth-contract"
import {EthereumContract} from "@rarible/ethereum-provider"
import {toAddress, toBigNumber, toBinary, toWord, ZERO_ADDRESS} from "@rarible/types"
import {toBn} from "@rarible/utils/build/bn"
import {send as sendTemplate, sentTx} from "../common/send-transaction"
import {Config} from "../config/type"
import {E2E_CONFIG} from "../config/e2e"
import {getOrderTemplate, TestAssetClass} from "./test/order-opensea"
import {approveErc20 as approveErc20Template} from "./approve-erc20"
import {deployTestErc20} from "./contracts/test/test-erc20"
import {deployTestErc721} from "./contracts/test/test-erc721"
import {deployTestErc1155} from "./contracts/test/test-erc1155"
import {deployTransferProxy} from "./contracts/test/test-transfer-proxy"
import {deployErc20TransferProxy} from "./contracts/test/test-erc20-transfer-proxy"
import {deployTestRoyaltiesProvider} from "./contracts/test/test-royalties-provider"
import {deployTestExchangeV2} from "./contracts/test/test-exchange-v2"
import {deployOpenseaProxyRegistry} from "./contracts/test/opensea/test-proxy-registry"
import {deployOpenseaTokenTransferProxy} from "./contracts/test/opensea/test-token-transfer-proxy"
import {deployOpenSeaExchangeV1} from "./contracts/test/opensea/test-exchange-opensea-v1"
import {createOpenseaProxyRegistryEthContract} from "./contracts/proxy-registry-opensea"
import {getOrderSignature, SimpleOpenSeaV1Order} from "./sign-order"
import {approveOpensea} from "./approve-opensea"
import {fillOrder} from "./fill-order"
import {getMakeFee} from "./get-make-fee"

describe("fillOrder: Opensea orders", function () {
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

	const config: Config = E2E_CONFIG

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

		config.exchange.openseaV1 = toAddress(wyvernExchange.options.address)
		config.proxyRegistries.openseaV1 = toAddress(wyvernProxyRegistry.options.address)
		config.transferProxies.openseaV1 = toAddress(wyvernTokenTransferProxy.options.address)
		config.chainId = 1

		proxyRegistryEthContract = await createOpenseaProxyRegistryEthContract(ethereum1, toAddress(wyvernProxyRegistry.options.address))

		await proxyRegistryEthContract
			.functionCall("grantInitialAuthentication", wyvernExchange.options.address)
			.send()

	})

	async function mintTestAsset(asset: Asset, sender: Address): Promise<any> {
		switch (asset.assetType.assetClass) {
			case "ERC20": {
				return await sentTx(it.testErc20.methods.mint(sender, asset.value), { from: sender })
			}
			case "ERC721": {
				return await sentTx(it.testErc721.methods.mint(sender, asset.assetType.tokenId, "0x"), { from: sender })
			}
			case "ERC1155": {
				return await sentTx(it.testErc1155.methods.mint(sender, asset.assetType.tokenId, asset.value, "0x"), { from: sender })
			}
			default:
		}
	}

	function updateSideWithContract(side: Asset): Asset {
		switch (side.assetType.assetClass) {
			case "ERC20": {
				return {
					...side,
					assetType: {
						...side.assetType,
						contract: toAddress(it.testErc20.options.address),
					},
				}
			}
			case "ERC721": {
				return {
					...side,
					assetType: {
						...side.assetType,
						contract: toAddress(it.testErc721.options.address),
					},
				}
			}
			case "ERC1155": {
				return {
					...side,
					assetType: {
						...side.assetType,
						contract: toAddress(it.testErc1155.options.address),
					},
				}
			}

			default: return side
		}
	}

	/*
	test("match erc1155 for eth", async () => {

		const order: SimpleOpenSeaV1Order = {
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

		// order.maker = toAddress(sender1Address)
		// order.taker = toAddress(sender2Address)

		await mintTestAsset(order.take, sender2Address)
		await mintTestAsset(order.make, sender1Address)
		await approveOpensea(ethereum1, send, config, sender2Address, order.make)

		const signature = toBinary(await getOrderSignature(ethereum1, order))

		const filledOrder = await fillOrder(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum2,
			send,
			orderApi,
			(() => {}) as any,
			config,
			{
				...order,
				signature,
			},
			{amount: +order.take.value}
		)
		await filledOrder.build().runAll()

	})


	 */

	describe.each([
		getOrderTemplate("ERC721", "ETH", "SELL"),
		getOrderTemplate("ERC721", "ERC20", "SELL"),
		getOrderTemplate("ERC1155", "ETH", "SELL"),
		getOrderTemplate("ERC1155", "ERC20", "SELL"),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder

			beforeEach(async () => {
				order.data.exchange = toAddress(wyvernExchange.options.address)
				order.data.feeRecipient = toAddress(sender2Address)
				order.maker = toAddress(sender2Address)
				// order.taker = toAddress(sender1Address)

				await mintTestAsset(order.take, sender1Address)
				await mintTestAsset(order.make, sender2Address)
				order.make = updateSideWithContract(order.make)
				order.take = updateSideWithContract(order.take)
				await approveOpensea(ethereum2, send, config, sender2Address, order.make)

				order.signature = toBinary(await getOrderSignature(ethereum2, order))

			})

			test("returns", async () => {

				const filledOrder = await fillOrder(
					getMakeFee.bind(null, { v2: 100 }),
					ethereum1,
					send,
					orderApi,
					(() => {}) as any,
					config,
					order,
					{amount: +order.make.value}
				)
				await filledOrder.build().runAll()
			})
		})


	describe.each([
		getOrderTemplate("ETH", "ERC721", "BUY"),
		getOrderTemplate("ETH", "ERC1155", "BUY"),
		getOrderTemplate("ERC20", "ERC721", "BUY"),
		getOrderTemplate("ERC20", "ERC1155", "BUY"),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder

			beforeEach(async () => {
				order.data.exchange = toAddress(wyvernExchange.options.address)
				order.data.feeRecipient = toAddress(ZERO_ADDRESS)
				order.maker = toAddress(sender1Address)
				// order.taker = toAddress(sender1Address)

				await mintTestAsset(order.take, sender2Address)
				await mintTestAsset(order.make, sender1Address)
				order.make = updateSideWithContract(order.make)
				order.take = updateSideWithContract(order.take)
				await approveOpensea(ethereum1, send, config, sender2Address, order.make)

				order.signature = toBinary(await getOrderSignature(ethereum1, order))
			})

			test("returns", async () => {

				const filledOrder = await fillOrder(
					getMakeFee.bind(null, { v2: 100 }),
					ethereum2,
					send,
					orderApi,
					(() => {}) as any,
					config,
					order,
					{amount: +order.make.value}
				)
				await filledOrder.build().runAll()
			})
		})


})
