import {
	awaitAll,
	createGanacheProvider,
	deployErc20TransferProxy,
	deployMerkleValidator,
	deployOpenSeaExchangeV1,
	deployOpenseaProxyRegistry,
	deployOpenseaTokenTransferProxy,
	deployTestErc1155,
	deployTestErc20,
	deployTestErc721,
	deployTestExchangeBulkV2,
	deployTestExchangeV2,
	deployTestRoyaltiesProvider,
	deployTransferProxy,
} from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import type { Address, Asset } from "@rarible/ethereum-api-client"
import { OrderOpenSeaV1DataV1Side } from "@rarible/ethereum-api-client"
import type { Contract } from "web3-eth-contract"
import type { EthereumContract } from "@rarible/ethereum-provider"
import { randomAddress, randomWord, toAddress, toBigNumber, toBinary, ZERO_ADDRESS, ZERO_WORD } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import { getSimpleSendWithInjects, sentTx } from "../../../common/send-transaction"
import type { EthereumConfig } from "../../../config/type"
import { getEthereumConfig } from "../../../config"
import { id32 } from "../../../common/id"
import { getOrderSignature, getOrderTemplate } from "../../test/order-opensea"
import { createOpenseaProxyRegistryEthContract } from "../../contracts/proxy-registry-opensea"
import { createEthereumApis } from "../../../common/apis"
import { checkChainId } from "../../check-chain-id"
import { OpenSeaOrderHandler } from "../open-sea"
import { OrderFiller } from "../index"
import type { SimpleOrder } from "../../types"
import { signOrder } from "../../sign-order"
import { BulkV2OHandler } from "./bulk-v2"

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

	const openSeaBulkFillHandler = new BulkV2OHandler(ethereum1, send1, config, apis, getBaseOrderFee)
	const openSeaFillHandler1 = new OpenSeaOrderHandler(ethereum1, send1, config, apis, getBaseOrderFee)
	const openSeaFillHandler2 = new OpenSeaOrderHandler(ethereum2, send2, config, apis, getBaseOrderFee)
	const orderFiller1 = new OrderFiller(ethereum1, send1, config, apis, getBaseOrderFee)
	const filler = new OrderFiller(ethereum1, send1, config, apis, getBaseOrderFee)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		exchangeV2: deployTestExchangeV2(web3),
		bulkExchange: deployTestExchangeBulkV2(web3),
		merkleValidator: deployMerkleValidator(web3),
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
		proxyRegistryEthContract = await createOpenseaProxyRegistryEthContract(
			ethereum1,
			toAddress(wyvernProxyRegistry.options.address)
		)
		await sentTx(
			wyvernProxyRegistry.methods.registerProxy(),
			{ from: sender1Address }
		)
		await sentTx(
			wyvernProxyRegistry.methods.registerProxy(),
			{ from: sender2Address }
		)

		wyvernTokenTransferProxy = await deployOpenseaTokenTransferProxy(web3, wyvernProxyRegistry.options.address)

		wyvernExchange = await deployOpenSeaExchangeV1(
			web3,
			wyvernProxyRegistry.options.address,
			wyvernTokenTransferProxy.options.address,
			ZERO_ADDRESS, // ERC20
			// feeRecipient, // default first from web3 addresses
		)
		await proxyRegistryEthContract
			.functionCall("endGrantAuthentication", wyvernExchange.options.address)
			.send()
		await proxyRegistryEthContract
			.functionCall("grantInitialAuthentication", wyvernExchange.options.address)
			.send()

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

		await sentTx(
			it.bulkExchange.methods.__ExchangeBulkV2_init(
				wyvernExchange.options.address,
				it.exchangeV2.options.address,
			),
			{ from: sender1Address }
		)

		config.openSea.proxyRegistry = toAddress(wyvernProxyRegistry.options.address)
		config.openSea.merkleValidator = toAddress(it.merkleValidator.options.address)
		config.openSea.metadata = ZERO_WORD

		config.exchange.v2 = toAddress(it.exchangeV2.options.address)
		config.transferProxies.openseaV1 = toAddress(wyvernTokenTransferProxy.options.address)
		config.transferProxies.erc20 = toAddress(it.erc20TransferProxy.options.address)

		config.exchange.openseaV1 = toAddress(wyvernExchange.options.address)
		config.exchange.v2 = toAddress(it.exchangeV2.options.address)
		config.exchange.bulkV2 = toAddress(it.bulkExchange.options.address)

		console.log("config.openSea", config.openSea)
		console.log("config.transferProxies", config.transferProxies)
		console.log("config.exchange", config.exchange)

		config.chainId = 17

		await sentTx(it.transferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})
		await sentTx(it.erc20TransferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})

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
	test("should fill bulk of orders ERC721", async () => {
		const order = getOrderTemplate("ERC721", "ETH", OrderOpenSeaV1DataV1Side.SELL, true)
		const nftOwner = sender2Address
		const nftBuyer = sender1Address
		const nftOwnerEthereum = ethereum2
		order.make = setTestContract(order.make)
		order.take = setTestContract(order.take)
		order.data.takerRelayerFee = toBigNumber("0")
		order.data.takerProtocolFee = toBigNumber("0")
		order.data.makerRelayerFee = toBigNumber("1000")
		order.data.makerProtocolFee = toBigNumber("0")
		order.data.exchange = toAddress(config.exchange.openseaV1)
		order.data.feeRecipient = toAddress(feeRecipient)
		order.maker = toAddress(nftOwner)
		order.data.target = toAddress(config.openSea.merkleValidator!)
		order.signature = toBinary(await getOrderSignature(nftOwnerEthereum, order))
		const now = Math.floor(Date.now() / 1000)
		order.start = now - 60*60
		order.end = now + 60*60

		await mintTestAsset(order.make, nftOwner)
		await mintTestAsset(order.take, nftBuyer)
		await openSeaFillHandler2.approveSingle(nftOwner, order.make, false)
		await openSeaFillHandler2.approveSingle(nftOwner, order.take, false)


		const nftSellerInitBalance = await getBalance(order.make, nftOwner)
		const inverted = await openSeaFillHandler1.invert({ order }, sender2Address)
		// await openSeaFillHandler1.approve(inverted, false)
		const result = await openSeaFillHandler1.sendTransaction(order, inverted)
		//await openSeaBulkFillHandler.sendTransaction([{ order }])
		console.log("result", result)
		// console.log("DEBUG", await txdebug(web3, result.hash))
		await web3.eth.getTransaction(result.hash, function (error, result){
			console.log("transaction data", result)
			console.log("transaction error", error)
		})
		const nftSellerFinalBalance = await getBalance(order.make, nftOwner)

		expect(nftSellerFinalBalance).not.toBe(nftSellerInitBalance)
	})

	test("should match order(buy erc1155 for eth)", async () => {
		//sender1 has ETH, sender2 has ERC1155

		const tokenId = "3"
		await sentTx(it.testErc1155.methods.mint(sender2Address, tokenId, 10, "0x"), { from: sender1Address })

		const left: SimpleOrder = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber(tokenId),
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

		const before1 = toBn(await it.testErc1155.methods.balanceOf(sender1Address, tokenId).call())
		const before2 = toBn(await it.testErc1155.methods.balanceOf(sender2Address, tokenId).call())

		const finalOrder = { ...left, signature }
		const originFees = [{
			account: randomAddress(),
			value: 100,
		}]
		await filler.buy({ order: finalOrder, amount: 2, originFees })

		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, tokenId).call()).toString()).toBe(
			before2.minus(2).toFixed()
		)
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, tokenId).call()).toString()).toBe(
			before1.plus(2).toFixed()
		)
	})

})


async function txdebug(web3: Web3, txhash: string) {
	const options = {
		disableStorage: true,
		disableMemory: true,
		disableStack: true,
		tracer: "{step(){},fault(){},result(log){return { failed: !!log.error, returnValue: toHex(log.output)}}}",
	}
	return new Promise(function (resolve, reject) {
		// @ts-ignore
		web3.currentProvider?.send({
			jsonrpc: "2.0",
			id: new Date().getTime(),
			method: "debug_traceTransaction",
			params: [txhash, options],
		}, function (err: any, data: any) {
			if (err === null) {
				resolve(data.result)
			} else {
				reject(err)
			}
		})
	})
}
