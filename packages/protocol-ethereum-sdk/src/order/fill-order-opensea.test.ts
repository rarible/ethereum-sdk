import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import {
	Address,
	Asset,
	Configuration,
	Erc1155AssetType,
	GatewayControllerApi,
	OrderControllerApi,
} from "@rarible/protocol-api-client"
import { Contract } from "web3-eth-contract"
import { EthereumContract } from "@rarible/ethereum-provider"
import { toAddress, toBigNumber, toBinary, toWord, ZERO_ADDRESS } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import { send as sendTemplate, sentTx } from "../common/send-transaction"
import { Config } from "../config/type"
import { E2E_CONFIG } from "../config/e2e"
import { getAssetTypeBlank, getOrderTemplate, OPENSEA_ORDER_TEMPLATE } from "./test/order-opensea"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { deployTestErc1155 } from "./contracts/test/test-erc1155"
import { deployTransferProxy } from "./contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "./contracts/test/test-erc20-transfer-proxy"
import { deployTestRoyaltiesProvider } from "./contracts/test/test-royalties-provider"
import { deployTestExchangeV2 } from "./contracts/test/test-exchange-v2"
import { deployOpenseaProxyRegistry } from "./contracts/test/opensea/test-proxy-registry"
import { deployOpenseaTokenTransferProxy } from "./contracts/test/opensea/test-token-transfer-proxy"
import { deployOpenSeaExchangeV1 } from "./contracts/test/opensea/test-exchange-opensea-v1"
import { createOpenseaProxyRegistryEthContract } from "./contracts/proxy-registry-opensea"
import {
	convertOpenSeaOrderToSignDTO,
	SimpleOpenSeaV1Order, SimpleOrder,
} from "./sign-order"
import { getOrderSignature, hashOpenSeaV1Order, hashToSign } from "./test/order-opensea"
import { approveOpensea, getRegisteredProxy } from "./approve-opensea"
import {
	fillOrder,
	getAtomicMatchArgAddresses,
	getAtomicMatchArgCommonData,
	getAtomicMatchArgUints, getOpenseaAssetV1,
	getOpenseaOrdersForMatching,
} from "./fill-order"
import { getMakeFee, GetMakeFeeFunction } from "./get-make-fee"
import { createOpenseaContract } from "./contracts/exchange-opensea-v1"
import { cancel } from "./cancel"
import { invertOrder } from "./invert-order"
import { addFee } from "./add-fee"

describe("fillOrder: Opensea orders", function () {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address, feeRecipient] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const gatewayApi = new GatewayControllerApi(configuration)
	const send1 = sendTemplate.bind(ethereum1, gatewayApi)
	const send2 = sendTemplate.bind(ethereum2, gatewayApi)

	let orderApi: OrderControllerApi

	const config: Config = {
		...E2E_CONFIG,
		chainId: 1,
		feeRecipients: {
			openseaV1: feeRecipient,
		},
	}

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		exchangeV2: deployTestExchangeV2(web3),
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

	async function approve(asset: Asset, sender: Address): Promise<any> {
		switch (asset.assetType.assetClass) {
			case "ERC20": {
				return await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, asset.value), { from: sender })
			}
			case "ERC721": {
				// return await sentTx(it.testErc721.methods.approve(wyvernTokenTransferProxy.options.address, asset.value), { from: sender })
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
			+order.make.value,
			sender1Address,
			config.feeRecipients.openseaV1
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
			+order.make.value,
			sender1Address,
			config.feeRecipients.openseaV1
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
		await approveOpensea(ethereum2, send2, config, sender2Address, order.make)

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


	/*
	test("should fill order (sell erc1155 for erc20)", async () => {
		const nftOwner = sender2Address
		const nftBuyer = sender1Address
		const nftOwnerEthereum = ethereum2
		const nftBuyerEthereum = ethereum1
		const sendOwner = send2
		const sendBuyer = send1

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("3"),
				},
				value: toBigNumber("1"),
			},
			maker: nftOwner,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("100"),
			},
			salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			start: 0,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(wyvernExchange.options.address),
				makerRelayerFee: toBigNumber("1000"),
				takerRelayerFee: toBigNumber("0"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(feeRecipient),
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

		const asset = addFee(left.take, +left.data.takerRelayerFee)

		// console.log('approve asset', asset)
		await sentTx(it.testErc20.methods.mint(nftBuyer, 100000), { from: nftBuyer })
		await sentTx(it.testErc20.methods.mint(nftOwner, 100000), { from: nftOwner })
		await sentTx(it.testErc1155.methods.mint(nftOwner, 3, 10, "0x"), { from: nftOwner })


		// await approveOpensea(nftOwnerEthereum, sendOwner, config, left.maker, left.make)
		const proxyAddress = await getRegisteredProxy(nftOwnerEthereum, toAddress(wyvernProxyRegistry.options.address))
		const allowance = await it.testErc20.methods.allowance(nftBuyer, wyvernTokenTransferProxy.options.address)
			.call()
		console.log("allowance from", nftBuyer, "to", wyvernTokenTransferProxy.options.address, "=", allowance)
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, asset.value), { from: nftBuyer })
		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, asset.value), { from: nftOwner })
		await sentTx(it.testErc1155.methods.setApprovalForAll(proxyAddress, true), { from: nftOwner })

		console.log("nft buyer approve to", wyvernTokenTransferProxy.options.address, "from", nftBuyer, "amount", asset.value)

		const signature = toBinary(await getOrderSignature(nftOwnerEthereum, left))

		const initBalanceErc20NftBuyer = toBn(await it.testErc20.methods.balanceOf(nftBuyer).call())
		const initBalanceErc20NftOwner = toBn(await it.testErc20.methods.balanceOf(nftOwner).call())
		const initBalanceErc1155NftOwner = toBn(await it.testErc1155.methods.balanceOf(nftOwner, 3).call())

		const filledOrder = await fillOrder(
			getMakeFee.bind(null, { v2: 100 }),
			nftBuyerEthereum,
			sendBuyer,
			{} as any,
			config,
			{ order: { ...left, signature }, amount: +left.make.value }
		)

		await filledOrder.build().runAll()

		console.log("nft buyer erc20", initBalanceErc20NftBuyer.toString(), "final balance", (await it.testErc20.methods.balanceOf(nftBuyer).call()).toString())
		expect(toBn(await it.testErc20.methods.balanceOf(nftBuyer).call()).toString()).toBe(
			initBalanceErc20NftBuyer.minus(100).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(nftOwner, 3).call()).toString()).toBe(
			initBalanceErc1155NftOwner.minus(1).toFixed()
		)
		console.log("nft owner erc20", initBalanceErc20NftOwner.toString(), "final balance", (await it.testErc20.methods.balanceOf(nftOwner).call()).toString())
		expect(toBn(await it.testErc20.methods.balanceOf(nftOwner).call()).toString()).toBe(
			//cost 100 eth minus 10% fee
			initBalanceErc20NftOwner.minus(10).plus(100).toFixed()
		)
	})

	 */
	/*
	test("should fill order (buy erc1155 for erc20)", async () => {
		const nftOwner = sender2Address
		const nftBuyer = sender1Address
		const nftOwnerEthereum = ethereum2
		const nftBuyerEthereum = ethereum1
		const sendNftOwner = send2
		const sendNftBuyer = send1

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("100"),
			},
			maker: nftBuyer,
			take: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("55555"),
				},
				value: toBigNumber("1"),
			},
			salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			start: 0,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(wyvernExchange.options.address),
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("1000"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress(ZERO_ADDRESS),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0xf242432a00000000000000000000000000d5cbc289e4b66a6252949d6eb6ebbb12df24ab00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000"),
				replacementPattern: toBinary("0x000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		console.log("before signature")
		const signature = toBinary(await getOrderSignature(nftBuyerEthereum, left))

		console.log("after signature")
		const asset = addFee(left.make, +left.data.takerRelayerFee)
		console.log("after fee", asset)

		// console.log('approve asset', asset)
		await sentTx(it.testErc20.methods.mint(nftBuyer, asset.value), { from: nftBuyer })
		// await sentTx(it.testErc20.methods.mint(nftOwner, asset.value), { from: nftOwner })
		await sentTx(it.testErc1155.methods.mint(nftOwner, 55555, 10, "0x"), { from: nftOwner })


		// await approveOpensea(nftOwnerEthereum, sendNftOwner, config, left.maker, left.make)
		const proxyAddress = await getRegisteredProxy(nftOwnerEthereum, toAddress(wyvernProxyRegistry.options.address))
		const proxyAddressBuyer = await getRegisteredProxy(nftBuyerEthereum, toAddress(wyvernProxyRegistry.options.address))
		await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, asset.value), { from: nftBuyer })
		// await sentTx(it.testErc20.methods.approve(wyvernTokenTransferProxy.options.address, asset.value), { from: nftOwner })
		await sentTx(it.testErc1155.methods.setApprovalForAll(proxyAddress, true), { from: nftOwner })


		const initBalanceErc20NftBuyer = toBn(await it.testErc20.methods.balanceOf(nftBuyer).call())
		const initBalanceErc20NftOwner = toBn(await it.testErc20.methods.balanceOf(nftOwner).call())
		const initBalanceErc1155NftOwner = toBn(await it.testErc1155.methods.balanceOf(nftOwner, 55555).call())

		console.log("before fill order")
		const filledOrder = await fillOrder(
			getMakeFee.bind(null, { v2: 100 }),
			nftOwnerEthereum,
			sendNftOwner,
			{} as any,
			config,
			{ order: { ...left, signature }, amount: +left.make.value }
		)

		await filledOrder.build().runAll()

		expect(toBn(await it.testErc20.methods.balanceOf(nftBuyer).call()).toString()).toBe(
			initBalanceErc20NftBuyer.minus(110).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(nftOwner, 55555).call()).toString()).toBe(
			initBalanceErc1155NftOwner.minus(1).toFixed()
		)
		expect(toBn(await it.testErc20.methods.balanceOf(nftOwner).call()).toString()).toBe(
			initBalanceErc20NftOwner.plus(100).toFixed()
		)
	})


	 */


	/*
	// Sell-side orders
	describe.each([
		getOrderTemplate("ERC721", "ETH", "SELL"),
		// getOrderTemplate("ERC721", "ERC20", "SELL"),
		// getOrderTemplate("ERC1155", "ETH", "SELL"),
		// getOrderTemplate("ERC1155", "ERC20", "SELL"),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder
			const nftOwner = sender2Address
			const nftBuyer = sender1Address
			const nftOwnerEthereum = ethereum2
			const nftBuyerEthereum = ethereum1
			const sendNftOwner = send2
			const sendNftBuyer = send1

			beforeEach(async () => {
				order.make = setTestContract(order.make)
				order.take = setTestContract(order.take)
				order.data.makerRelayerFee = toBigNumber("500")
				order.data.exchange = toAddress(wyvernExchange.options.address)
				order.data.feeRecipient = toAddress(feeRecipient)
				order.maker = toAddress(nftOwner)
				// order.data.feeMethod = "PROTOCOL_FEE"

				await mintTestAsset(order.make, nftOwner)
				await mintTestAsset(order.take, nftBuyer)
				//Mint erc20 to nft owner for pay fee
				await mintTestAsset(order.take, nftOwner)
				// const asset = addFee(order.take, +order.data.makerRelayerFee)
				const asset = getOpenseaAssetV1(order)
				console.log("take asset with fee", asset)
				// asset.value = toBigNumber("500")
				await approveOpensea(nftOwnerEthereum, sendNftOwner, config, nftOwner, order.make, true)
				await approveOpensea(nftOwnerEthereum, sendNftOwner, config, nftOwner, asset, true)

				order.signature = toBinary(await getOrderSignature(nftOwnerEthereum, order))

				// debugger
			})

			test("should match order", async () => {

				const nftSellerInitBalance = await getBalance(order.make, nftOwner)

				// const initBalanceErc20NftBuyer = await it.testErc20.methods.balanceOf(nftBuyer).call()
				// const initBalanceErc20NftOwner = await it.testErc20.methods.balanceOf(nftOwner).call()


				const filledOrder = await fillOrder(
					getMakeFee.bind(null, { v2: 100 }),
					nftBuyerEthereum,
					sendNftBuyer,
					{} as any,
					config,
					{ order: { ...order }, amount: +order.make.value }
				)

				await filledOrder.build().runAll()

				const nftSellerFinalBalance = await getBalance(order.make, nftOwner)

				// const finalBalanceErc20Buyer = await it.testErc20.methods.balanceOf(nftBuyer).call()
				// const finalBalanceErc20Owner = await it.testErc20.methods.balanceOf(nftOwner).call()

				// console.log("initBalanceErc20NftOwner", initBalanceErc20NftOwner, "finalBalanceErc20Owner", finalBalanceErc20Owner)
				// console.log("initBalanceErc20NftBuyer", initBalanceErc20NftBuyer, "finalBalanceErc20Buyer", finalBalanceErc20Buyer)

				expect(nftSellerFinalBalance).not.toBe(nftSellerInitBalance)


			})
		})

	 */


	// Buy-side orders
	describe.each([
		// getOrderTemplate("ETH", "ERC721", "BUY"),
		// getOrderTemplate("ETH", "ERC1155", "BUY"),
		// getOrderTemplate("ERC20", "ERC721", "BUY"),
		getOrderTemplate("ERC20", "ERC1155", "BUY"),
	])(
		"side: $data.side $make.assetType.assetClass for $take.assetType.assetClass",
		(testOrder) => {
			let order: SimpleOpenSeaV1Order = testOrder
			const nftOwner = sender2Address
			const nftBuyer = sender1Address
			const nftOwnerEthereum = ethereum2
			const nftBuyerEthereum = ethereum1
			const sendNftOwner = send2
			const sendNftBuyer = send1

			beforeEach(async () => {
				order.data.exchange = toAddress(wyvernExchange.options.address)
				order.data.takerRelayerFee = toBigNumber("250")
				// order.data.takerProtocolFee = toBigNumber("250")
				order.data.makerRelayerFee = toBigNumber("250")
				// order.data.makerProtocolFee = toBigNumber("250")
				order.data.feeRecipient = toAddress(ZERO_ADDRESS)
				// order.data.feeRecipient = toAddress(feeRecipient)
				order.maker = toAddress(nftBuyer)
				order.make = setTestContract(order.make)
				order.take = setTestContract(order.take)
				// order.data.feeMethod = "PROTOCOL_FEE"

				await mintTestAsset(order.take, nftOwner)
				await mintTestAsset(order.make, nftBuyer)
				await approveOpensea(nftBuyerEthereum, sendNftBuyer, config, nftBuyer, order.make, true)
				// const asset = getOpenseaAssetV1(order)
				const asset = { ...order.make }
				// asset.value = toBigNumber("2")
				// await approveOpensea(nftOwnerEthereum, sendNftOwner, config, nftOwner, asset, false)

				order.signature = toBinary(await getOrderSignature(nftBuyerEthereum, order))
			})

			test("should match order", async () => {
				const nftSellerInitBalance = await getBalance(order.take, nftOwner)

				const filledOrder = await fillOrder(
					getMakeFee.bind(null, { v2: 100 }),
					nftOwnerEthereum,
					sendNftOwner,
					orderApi,
					config,
					{ order, amount: +order.make.value }
				)
				await filledOrder.build().runAll()

				const nftSellerFinalBalance = await getBalance(order.take, nftOwner)

				expect(nftSellerFinalBalance).not.toBe(nftSellerInitBalance)
			})
		})


})
