import {
	awaitAll,
	createGanacheProvider,
	deployOpenSeaExchangeV1,
	deployOpenseaTokenTransferProxy,
	deployTestErc20,
	deployTestErc721,
	deployTestErc1155,
	deployOpenseaProxyRegistry,
} from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import type { Address, Asset } from "@rarible/ethereum-api-client"
import { OrderOpenSeaV1DataV1Side } from "@rarible/ethereum-api-client"
import type { Contract } from "web3-eth-contract"
import type { EthereumContract } from "@rarible/ethereum-provider"
import { toAddress, toBigNumber, toBinary, ZERO_ADDRESS } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import { sentTx, getSimpleSendWithInjects } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { getEthereumConfig } from "../../config"
import { id32 } from "../../common/id"
import {
	getAssetTypeBlank,
	getOrderSignature,
	getOrderTemplate,
	hashOpenSeaV1Order,
	hashToSign,
	OPENSEA_ORDER_TEMPLATE,
} from "../test/order-opensea"
import { createOpenseaProxyRegistryEthContract } from "../contracts/proxy-registry-opensea"
import { createOpenseaContract } from "../contracts/exchange-opensea-v1"
import { cancel } from "../cancel"
import type { SimpleOpenSeaV1Order } from "../types"
import { createEthereumApis } from "../../common/apis"
import { checkChainId } from "../check-chain-id"
import {
	getAtomicMatchArgAddresses,
	getAtomicMatchArgCommonData,
	getAtomicMatchArgUints,
	OpenSeaOrderHandler,
} from "./open-sea"
import { convertOpenSeaOrderToDTO } from "./open-sea-converter"
import { OrderFiller } from "./index"

describe("fillOrder: Opensea orders", function () {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address, feeRecipient] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const env = "e2e" as const
	const config: EthereumConfig = {
		...getEthereumConfig(env),
		openSea: {
			metadata: id32("RARIBLE"),
			proxyRegistry: ZERO_ADDRESS,
		},
	}
	const apis = createEthereumApis(env)

	const getBaseOrderFee = async () => 0
	const checkWalletChainId1 = checkChainId.bind(null, ethereum1, config)
	const checkWalletChainId2 = checkChainId.bind(null, ethereum2, config)

	const send1 = getSimpleSendWithInjects().bind(null, checkWalletChainId1)
	const send2 = getSimpleSendWithInjects().bind(null, checkWalletChainId2)

	const openSeaFillHandler1 = new OpenSeaOrderHandler(ethereum1, send1, config, getBaseOrderFee)
	const openSeaFillHandler2 = new OpenSeaOrderHandler(ethereum2, send2, config, getBaseOrderFee)
	const orderFiller1 = new OrderFiller(ethereum1, send1, config, apis, getBaseOrderFee)
	const orderFiller2 = new OrderFiller(ethereum2, send2, config, apis, getBaseOrderFee)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
	})

	let wyvernExchange: Contract
	let wyvernProxyRegistry: Contract
	let wyvernTokenTransferProxy: Contract
	let proxyRegistryEthContract: EthereumContract

	beforeAll(async () => {
		/**
		 * Configuring
		 */

		wyvernProxyRegistry = await deployOpenseaProxyRegistry(web3)
		console.log("deployed wyvernProxyRegistry", wyvernProxyRegistry.options.address)
		wyvernTokenTransferProxy = await deployOpenseaTokenTransferProxy(web3, wyvernProxyRegistry.options.address)
		console.log("deployed wyvernTokenTransferProxy", wyvernTokenTransferProxy.options.address)

		wyvernExchange = await deployOpenSeaExchangeV1(
			web3,
			wyvernProxyRegistry.options.address,
			wyvernTokenTransferProxy.options.address,
			it.testErc20.options.address,
		)
		console.log("deployed wyvernExchange", wyvernExchange.options.address)

		config.exchange.openseaV1 = toAddress(wyvernExchange.options.address)
		config.openSea.proxyRegistry = toAddress(wyvernProxyRegistry.options.address)
		config.transferProxies.openseaV1 = toAddress(wyvernTokenTransferProxy.options.address)

		proxyRegistryEthContract = await createOpenseaProxyRegistryEthContract(
			ethereum1,
			toAddress(wyvernProxyRegistry.options.address)
		)

		await proxyRegistryEthContract
			.functionCall("grantInitialAuthentication", wyvernExchange.options.address)
			.send()

	})

	async function mintTestAsset(asset: Asset, sender: Address): Promise<any> {
		switch (asset.assetType.assetClass) {
			case "ERC20": {
				return await sentTx(it.testErc20.methods.mint(sender, toBn(asset.value).multipliedBy(10)), { from: sender })
			}
			case "ERC721": {
				return await sentTx(it.testErc721.methods.mint(sender, asset.assetType.tokenId, "0x"), { from: sender })
			}
			case "ERC1155": {
				return await sentTx(it.testErc1155.methods.mint(sender, asset.assetType.tokenId, toBn(asset.value).multipliedBy(10), "0x"), { from: sender })
			}
			default:
		}
	}

	async function getBalance(asset: Asset, sender: Address): Promise<string> {
		switch (asset.assetType.assetClass) {
			case "ETH": {
				return toBn(await web3.eth.getBalance(sender)).toString()
			}
			case "ERC20": {
				return toBn(await it.testErc20.methods.balanceOf(sender).call()).toString()
			}
			case "ERC721": {
				return toBn(await it.testErc721.methods.balanceOf(sender).call()).toString()
			}
			case "ERC1155": {
				return toBn(await it.testErc1155.methods.balanceOf(sender, asset.assetType.tokenId).call()).toString()
			}
			default: throw new Error("Should specify the ERC asset")
		}
	}

	function setTestContract(side: Asset): Asset {
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

	test("should calculate valid hash", async () => {
		const exchangeContract = createOpenseaContract(ethereum1, toAddress(wyvernExchange.options.address))

		const order: SimpleOpenSeaV1Order = {
			...OPENSEA_ORDER_TEMPLATE,
			make: getAssetTypeBlank("ERC721"),
			maker: toAddress(sender1Address),
			take: getAssetTypeBlank("ETH"),
			data: {
				...OPENSEA_ORDER_TEMPLATE.data,
				exchange: toAddress(wyvernExchange.options.address),
				side: OrderOpenSeaV1DataV1Side.SELL,
			},
		}

		const orderHash = hashOpenSeaV1Order(ethereum1, order)
		const orderDTO = convertOpenSeaOrderToDTO(ethereum1, order)

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
		const { exchangeContract, buyDTO, sellDTO } = await prepareSimpleOrdersForTest()

		const ordersCanMatch = await exchangeContract
			.functionCall(
				"ordersCanMatch_",
				[...getAtomicMatchArgAddresses(buyDTO), ...getAtomicMatchArgAddresses(sellDTO)],
				[...getAtomicMatchArgUints(buyDTO), ...getAtomicMatchArgUints(sellDTO)],
				[...getAtomicMatchArgCommonData(buyDTO), ...getAtomicMatchArgCommonData(sellDTO)],
				buyDTO.calldata,
				sellDTO.calldata,
				buyDTO.replacementPattern,
				sellDTO.replacementPattern,
				buyDTO.staticExtradata,
				sellDTO.staticExtradata
			)
			.call()

		expect(ordersCanMatch).toBe(true)
	})

	test("should order price be correct", async () => {
		const { exchangeContract, buyDTO, sellDTO } = await prepareSimpleOrdersForTest()

		const orderMatchPrice = await exchangeContract
			.functionCall(
				"calculateMatchPrice_",
				[...getAtomicMatchArgAddresses(buyDTO), ...getAtomicMatchArgAddresses(sellDTO)],
				[...getAtomicMatchArgUints(buyDTO), ...getAtomicMatchArgUints(sellDTO)],
				[...getAtomicMatchArgCommonData(buyDTO), ...getAtomicMatchArgCommonData(sellDTO)],
				buyDTO.calldata,
				sellDTO.calldata,
				buyDTO.replacementPattern,
				sellDTO.replacementPattern,
				buyDTO.staticExtradata,
				sellDTO.staticExtradata
			)
			.call()

		expect(buyDTO.basePrice).toBe(orderMatchPrice)
	})

	test("should cancel order", async () => {
		const order: SimpleOpenSeaV1Order = {
			...OPENSEA_ORDER_TEMPLATE,
			make: getAssetTypeBlank("ERC721"),
			maker: toAddress(sender1Address),
			take: getAssetTypeBlank("ETH"),
			data: {
				...OPENSEA_ORDER_TEMPLATE.data,
				exchange: toAddress(wyvernExchange.options.address),
				side: OrderOpenSeaV1DataV1Side.SELL,
			},
		}
		await mintTestAsset(order.take, sender1Address)
		await mintTestAsset(order.make, sender2Address)
		order.make = setTestContract(order.make)
		order.take = setTestContract(order.take)
		await openSeaFillHandler2.approveSingle(sender2Address, order.make)

		const signature = toBinary(await getOrderSignature(ethereum1, order))

		const orderHash = hashOpenSeaV1Order(ethereum2, order)
		const signedHash = hashToSign(orderHash)

		const checkLazyOrder: any = async (form: any) => Promise.resolve(form)
		const cancelledOrder = await cancel(
			checkLazyOrder,
			ethereum1,
			send1,
			{
				openseaV1: toAddress(wyvernExchange.options.address),
				v1: ZERO_ADDRESS,
				v2: ZERO_ADDRESS,
			},
			checkChainId.bind(null, ethereum1, config),
			{
				...order,
				signature,
			},
		)

		const tx = await cancelledOrder.wait()

		const cancelEvent = tx.events.find(e => e.event === "OrderCancelled")

		expect(cancelEvent).toHaveProperty("args.hash", signedHash)

	})

	test("get transaction data", async () => {
		const order: SimpleOpenSeaV1Order = {
			...OPENSEA_ORDER_TEMPLATE,
			make: getAssetTypeBlank("ERC721"),
			maker: toAddress(sender1Address),
			take: getAssetTypeBlank("ETH"),
			data: {
				...OPENSEA_ORDER_TEMPLATE.data,
				exchange: toAddress(wyvernExchange.options.address),
				side: OrderOpenSeaV1DataV1Side.SELL,
				feeRecipient: toAddress(sender2Address),
			},
		}
		await mintTestAsset(order.take, sender1Address)
		await mintTestAsset(order.make, sender2Address)
		order.make = setTestContract(order.make)
		order.take = setTestContract(order.take)
	})

	// Sell-side orders
	describe.each([
		getOrderTemplate("ERC721", "ETH", OrderOpenSeaV1DataV1Side.SELL),
		getOrderTemplate("ERC721", "ERC20", OrderOpenSeaV1DataV1Side.SELL),
		getOrderTemplate("ERC1155", "ETH", OrderOpenSeaV1DataV1Side.SELL),
		getOrderTemplate("ERC1155", "ERC20", OrderOpenSeaV1DataV1Side.SELL),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder
			const nftOwner = sender2Address
			const nftBuyer = sender1Address
			const nftOwnerEthereum = ethereum2

			beforeEach(async () => {
				order.make = setTestContract(order.make)
				order.take = setTestContract(order.take)
				order.data.takerRelayerFee = toBigNumber("500")
				order.data.takerProtocolFee = toBigNumber("500")
				order.data.makerRelayerFee = toBigNumber("500")
				order.data.makerProtocolFee = toBigNumber("500")
				order.data.exchange = toAddress(wyvernExchange.options.address)
				order.data.feeRecipient = toAddress(feeRecipient)
				order.maker = toAddress(nftOwner)

				await mintTestAsset(order.make, nftOwner)
				await mintTestAsset(order.take, nftBuyer)
				await openSeaFillHandler2.approveSingle(nftOwner, order.make, false)
				await openSeaFillHandler2.approveSingle(nftOwner, order.take, false)

				order.signature = toBinary(await getOrderSignature(nftOwnerEthereum, order))

			})

			test("should match order", async () => {

				const nftSellerInitBalance = await getBalance(order.make, nftOwner)

				await orderFiller1.buy({ order })

				const nftSellerFinalBalance = await getBalance(order.make, nftOwner)

				expect(nftSellerFinalBalance).not.toBe(nftSellerInitBalance)

			})
		})

	// Buy-side orders
	describe.each([
		getOrderTemplate("ERC20", "ERC721", OrderOpenSeaV1DataV1Side.BUY),
		getOrderTemplate("ERC20", "ERC1155", OrderOpenSeaV1DataV1Side.BUY),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder
			const nftOwner = sender2Address
			const nftBuyer = sender1Address
			const nftBuyerEthereum = ethereum1

			beforeEach(async () => {
				order.data.exchange = toAddress(wyvernExchange.options.address)
				order.data.makerRelayerFee = toBigNumber("500")
				order.data.makerProtocolFee = toBigNumber("500")
				order.data.takerRelayerFee = toBigNumber("500")
				order.data.takerProtocolFee = toBigNumber("500")
				order.data.feeRecipient = feeRecipient
				order.maker = toAddress(nftBuyer)
				order.make = setTestContract(order.make)
				order.take = setTestContract(order.take)

				await mintTestAsset(order.take, nftOwner)
				await mintTestAsset(order.make, nftBuyer)
				const buyerApprovalAsset = {
					...order.make,
					value: toBigNumber(+order.data.takerRelayerFee + +order.data.takerProtocolFee + order.make.value),
				}
				await openSeaFillHandler1.approveSingle(nftBuyer, buyerApprovalAsset, false)

				order.signature = toBinary(await getOrderSignature(nftBuyerEthereum, order))
			})

			test("should match order", async () => {
				const nftSellerInitBalance = await getBalance(order.take, nftOwner)

				await orderFiller2.acceptBid({ order })

				const nftSellerFinalBalance = await getBalance(order.take, nftOwner)
				expect(nftSellerFinalBalance).not.toBe(nftSellerInitBalance)
			})
		})

	async function prepareSimpleOrdersForTest() {
		const exchangeContract = await createOpenseaContract(ethereum1, toAddress(wyvernExchange.options.address))

		const sell: SimpleOpenSeaV1Order = {
			...OPENSEA_ORDER_TEMPLATE,
			make: getAssetTypeBlank("ERC721"),
			maker: toAddress(sender1Address),
			take: getAssetTypeBlank("ETH"),
			data: {
				...OPENSEA_ORDER_TEMPLATE.data,
				exchange: toAddress(wyvernExchange.options.address),
				side: OrderOpenSeaV1DataV1Side.SELL,
				feeRecipient,
			},
		}
		const buy = openSeaFillHandler1.invert({ order: sell }, sender1Address)
		const buyDTO = convertOpenSeaOrderToDTO(ethereum1, buy)
		const sellDTO = convertOpenSeaOrderToDTO(ethereum1, sell)

		return {
			exchangeContract,
			buyDTO,
			sellDTO,
		}
	}
})
