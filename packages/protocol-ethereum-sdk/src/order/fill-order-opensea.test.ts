import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { Address, Asset } from "@rarible/protocol-api-client"
import { Contract } from "web3-eth-contract"
import { EthereumContract } from "@rarible/ethereum-provider"
import { toAddress, toBigNumber, toBinary, ZERO_ADDRESS } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import { sentTx, simpleSend } from "../common/send-transaction"
import { Config } from "../config/type"
import { E2E_CONFIG } from "../config/e2e"
import { id32 } from "../common/id"
import {
	getAssetTypeBlank,
	getOrderSignature,
	getOrderTemplate,
	hashOpenSeaV1Order,
	hashToSign,
	OPENSEA_ORDER_TEMPLATE,
} from "./test/order-opensea"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { deployTestErc1155 } from "./contracts/test/test-erc1155"
import { deployOpenseaProxyRegistry } from "./contracts/test/opensea/test-proxy-registry"
import { deployOpenseaTokenTransferProxy } from "./contracts/test/opensea/test-token-transfer-proxy"
import { deployOpenSeaExchangeV1 } from "./contracts/test/opensea/test-exchange-opensea-v1"
import { createOpenseaProxyRegistryEthContract } from "./contracts/proxy-registry-opensea"
import { convertOpenSeaOrderToSignDTO, SimpleOpenSeaV1Order } from "./sign-order"
import { approveOpensea } from "./approve-opensea"
import {
	fillOrder as fillOrderTemplate,
	getAtomicMatchArgAddresses,
	getAtomicMatchArgCommonData,
	getAtomicMatchArgUints,
	getOpenseaOrdersForMatching,
} from "./fill-order"
import { getMakeFee } from "./get-make-fee"
import { createOpenseaContract } from "./contracts/exchange-opensea-v1"
import { cancel } from "./cancel"

describe("fillOrder: Opensea orders", function () {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address, feeRecipient] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const config: Config = {
		...E2E_CONFIG,
		chainId: 1,
		openSea: {
			metadata: id32("RARIBLE"),
			feeRecipient: feeRecipient,
		},
	}

	const fillOrder = fillOrderTemplate.bind(
		null,
		getMakeFee.bind(null, { v2: 100 }),
		simpleSend,
		null as any,
		config
	)

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
				side: "SELL",
			},
		}

		const orderHash = hashOpenSeaV1Order(ethereum1, order)
		const orderDTO = convertOpenSeaOrderToSignDTO(ethereum1, order)

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

		const order: SimpleOpenSeaV1Order = {
			...OPENSEA_ORDER_TEMPLATE,
			make: getAssetTypeBlank("ERC721"),
			maker: toAddress(sender1Address),
			take: getAssetTypeBlank("ETH"),
			data: {
				...OPENSEA_ORDER_TEMPLATE.data,
				exchange: toAddress(wyvernExchange.options.address),
				side: "SELL",
			},
		}
		const { buy, sell } = await getOpenseaOrdersForMatching(
			ethereum1,
			order,
			sender1Address,
			config.openSea.feeRecipient
		)
		const buyDTO = convertOpenSeaOrderToSignDTO(ethereum1, buy)
		const sellDTO = convertOpenSeaOrderToSignDTO(ethereum1, sell)

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
		const exchangeContract = await createOpenseaContract(ethereum1, toAddress(wyvernExchange.options.address))

		const order: SimpleOpenSeaV1Order = {
			...OPENSEA_ORDER_TEMPLATE,
			make: getAssetTypeBlank("ERC721"),
			maker: toAddress(sender1Address),
			take: getAssetTypeBlank("ETH"),
			data: {
				...OPENSEA_ORDER_TEMPLATE.data,
				exchange: toAddress(wyvernExchange.options.address),
				side: "SELL",
			},
		}
		const { buy, sell } = await getOpenseaOrdersForMatching(
			ethereum1,
			order,
			sender1Address,
			config.openSea.feeRecipient
		)
		const buyDTO = convertOpenSeaOrderToSignDTO(ethereum1, buy)
		const sellDTO = convertOpenSeaOrderToSignDTO(ethereum1, sell)

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
				side: "SELL",
			},
		}
		await mintTestAsset(order.take, sender1Address)
		await mintTestAsset(order.make, sender2Address)
		order.make = setTestContract(order.make)
		order.take = setTestContract(order.take)
		await approveOpensea(ethereum2, simpleSend, config, sender2Address, order.make)

		const signature = toBinary(await getOrderSignature(ethereum1, order))

		const orderHash = hashOpenSeaV1Order(ethereum2, order)
		const signedHash = hashToSign(orderHash)

		const cancelledOrder = await cancel(
			ethereum1,
			{
				openseaV1: toAddress(wyvernExchange.options.address),
				v1: ZERO_ADDRESS,
				v2: ZERO_ADDRESS,
			},
			{
				...order,
				signature,
			},
		)

		const tx = await cancelledOrder.wait()

		const cancelEvent = tx.events.find(e => e.event === "OrderCancelled")

		expect(cancelEvent).toHaveProperty("args.hash", signedHash)

	})


	// Sell-side orders
	describe.each([
		getOrderTemplate("ERC721", "ETH", "SELL"),
		getOrderTemplate("ERC721", "ERC20", "SELL"),
		getOrderTemplate("ERC1155", "ETH", "SELL"),
		getOrderTemplate("ERC1155", "ERC20", "SELL"),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder
			const nftOwner = sender2Address
			const nftBuyer = sender1Address
			const nftOwnerEthereum = ethereum2
			const nftBuyerEthereum = ethereum1

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
				//Mint erc20 to nft owner for pay fee
				await mintTestAsset(order.take, nftOwner)
				await approveOpensea(nftOwnerEthereum, simpleSend, config, nftOwner, order.make, false)
				await approveOpensea(nftOwnerEthereum, simpleSend, config, nftOwner, order.take, false)

				order.signature = toBinary(await getOrderSignature(nftOwnerEthereum, order))

			})

			test("should match order", async () => {

				const nftSellerInitBalance = await getBalance(order.make, nftOwner)

				const filledOrder = await fillOrder(nftBuyerEthereum,  { order })
				await filledOrder.build().runAll()

				const nftSellerFinalBalance = await getBalance(order.make, nftOwner)

				expect(nftSellerFinalBalance).not.toBe(nftSellerInitBalance)

			})
		})

	// Buy-side orders
	describe.each([
		getOrderTemplate("ETH", "ERC721", "BUY"),
		getOrderTemplate("ETH", "ERC1155", "BUY"),
		getOrderTemplate("ERC20", "ERC721", "BUY"),
		getOrderTemplate("ERC20", "ERC1155", "BUY"),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder
			const nftOwner = sender2Address
			const nftBuyer = sender1Address
			const nftOwnerEthereum = ethereum2
			const nftBuyerEthereum = ethereum1

			beforeEach(async () => {
				order.data.exchange = toAddress(wyvernExchange.options.address)
				order.data.makerRelayerFee = toBigNumber("500")
				order.data.makerProtocolFee = toBigNumber("500")
				order.data.takerRelayerFee = toBigNumber("500")
				order.data.takerProtocolFee = toBigNumber("500")
				order.data.feeRecipient = toAddress(ZERO_ADDRESS)
				order.maker = toAddress(nftBuyer)
				order.make = setTestContract(order.make)
				order.take = setTestContract(order.take)

				await mintTestAsset(order.take, nftOwner)
				await mintTestAsset(order.make, nftBuyer)
				const buyerApprovalAsset = {
					...order.make,
					value: toBigNumber(+order.data.takerRelayerFee + +order.data.takerProtocolFee + order.make.value),
				}
				await approveOpensea(nftBuyerEthereum, simpleSend, config, nftBuyer, buyerApprovalAsset, false)

				order.signature = toBinary(await getOrderSignature(nftBuyerEthereum, order))
			})

			test("should match order", async () => {
				const nftSellerInitBalance = await getBalance(order.take, nftOwner)

				const filledOrder = await fillOrder(nftOwnerEthereum, { order })
				await filledOrder.build().runAll()

				const nftSellerFinalBalance = await getBalance(order.take, nftOwner)
				expect(nftSellerFinalBalance).not.toBe(nftSellerInitBalance)
			})
		})


})
