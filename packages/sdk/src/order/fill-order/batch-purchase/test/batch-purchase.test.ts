import {
	awaitAll,
	createE2eProvider,
	createGanacheProvider,
	deployErc20TransferProxy,
	deployTestErc1155,
	deployTestErc20,
	deployTestErc721,
	deployTestExchangeV2,
	deployTestExchangeWrapper,
	deployTestRoyaltiesProvider,
	deployTransferProxy,
} from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import type { Address, Asset, Part } from "@rarible/ethereum-api-client"
import { randomWord, toAddress, toBigNumber, ZERO_ADDRESS } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type { BigNumber } from "@rarible/utils"
import { getSimpleSendWithInjects, sentTx } from "../../../../common/send-transaction"
import type { EthereumConfig } from "../../../../config/type"
import { getEthereumConfig } from "../../../../config"
import { id32 } from "../../../../common/id"
import type { SimpleOrder, SimpleRaribleV2Order } from "../../../types"
import { createEthereumApis } from "../../../../common/apis"
import { checkChainId } from "../../../check-chain-id"
import { signOrder } from "../../../sign-order"
import { BatchOrderFiller } from "../batch-purchase"
import { createRaribleSdk } from "../../../../index"
import { getEstimateGasInjects } from "../../../../common/estimate-gas"
import {
	checkOwnerships, makeAmmOrder,
	makeLooksrareOrder,
	makeRaribleV2Order,
	makeSeaportOrder,
	ordersToRequests,
} from "./common/utils"

describe.skip("Batch purchase", function () {
	const providerConfig = {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	}
	const { provider: providerBuyer } = createE2eProvider(
		"0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a",
		providerConfig
	)
	const { provider: providerSeller } = createE2eProvider(
		"0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c",
		providerConfig
	)

	const web3Seller = new Web3(providerSeller as any)
	const ethereumSeller = new Web3Ethereum({ web3: web3Seller, gas: 3000000 })
	const ethereum = new Web3Ethereum({ web3: web3Seller, gas: 3000000 })

	const buyerWeb3 = new Web3Ethereum({ web3: new Web3(providerBuyer as any), gas: 3000000})
	const sdkBuyer = createRaribleSdk(buyerWeb3, "testnet")
	const sdkSeller = createRaribleSdk(ethereumSeller, "testnet")

	const config = getEthereumConfig("testnet")
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)
	const send = getSimpleSendWithInjects().bind(null, checkWalletChainId)

	beforeAll(async () => {
		console.log({
			buyerWallet: await buyerWeb3.getFrom(),
			sellerWallet: await ethereumSeller.getFrom(),
		})
	})

	async function buyout(orders: SimpleOrder[], originFees: Part[] | undefined) {
		const requests = ordersToRequests(orders, originFees)

		const tx = await sdkBuyer.order.buyBatch(requests)
		console.log(tx)
		await tx.wait()

		await checkOwnerships(
			sdkBuyer,
			orders.map((o) => o.make),
			toAddress("0xC66D094eD928f7840A6B0d373c1cd825C97e3C7c")
		)
	}

	test("RaribleOrder few items sell", async () => {
		const orders = await Promise.all([
			makeRaribleV2Order(sdkSeller, {}),
			makeRaribleV2Order(sdkSeller, {}),
		])

		await buyout(orders, [{
			account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
			value: 100,
		}])
	})

	test("Seaport few items sell", async () => {
		const orders = await Promise.all([
			makeSeaportOrder(sdkSeller, ethereum, send),
			makeSeaportOrder(sdkSeller, ethereum, send),
		])

		await buyout(orders, [{
			account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
			value: 100,
		}])
	})

	test("looksrare few items sell", async () => {
		const orders = await Promise.all([
			makeLooksrareOrder(sdkSeller, ethereum, send, config),
			makeLooksrareOrder(sdkSeller, ethereum, send, config),
		])

		await buyout(orders, [{
			account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
			value: 100,
		}])
	})

	test("amm sudoswap few items sell form different pools", async () => {
		const orders = await Promise.all([
			makeAmmOrder(sdkSeller, ethereum, send, config),
			makeAmmOrder(sdkSeller, ethereum, send, config),
		])

		const tx = await sdkBuyer.order.buyBatch(ordersToRequests(orders, [{
			account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
			value: 100,
		}]))
		console.log(tx)
		await tx.wait()
	})

	test("Different orders types sell", async () => {
		const orders = await Promise.all([
			makeRaribleV2Order(sdkSeller, {}),
			makeSeaportOrder(sdkSeller, ethereum, send),
			makeLooksrareOrder(sdkSeller, ethereum, send, config),
			makeRaribleV2Order(sdkSeller, {}),
		])

		const requests = [
			...(ordersToRequests([orders[0]], [{
				account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
				value: 100,
			}])),
			...(ordersToRequests([orders[1]], [{
				account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
				value: 400,
			}, {
				account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
				value: 300,
			}])),
			...(ordersToRequests([orders[2]], [{
				account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
				value: 200,
			}, {
				account: toAddress("0xFc7b41fFC023bf3eab6553bf4881D45834EF1E8a"),
				value: 500,
			}])),
			...(ordersToRequests([orders[3]], undefined)),
		]

		const tx = await sdkBuyer.order.buyBatch(requests)
		console.log(tx)
		await tx.wait()

		await checkOwnerships(
			sdkBuyer,
			orders.map((o) => o.make),
			toAddress("0xC66D094eD928f7840A6B0d373c1cd825C97e3C7c")
		)
	})
})

describe.skip("fillOrder: Opensea orders", function () {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const env = "testnet" as const
	const config: EthereumConfig = {
		...getEthereumConfig(env),
		openSea: {
			metadata: id32("RARIBLE"),
			proxyRegistry: ZERO_ADDRESS,
		},
	}
	const apis = createEthereumApis(env)

	const getBaseOrderFee = async () => 100
	const checkWalletChainId1 = checkChainId.bind(null, ethereum1, config)
	// const checkWalletChainId2 = checkChainId.bind(null, ethereum2, config)

	const send1 = getSimpleSendWithInjects().bind(null, checkWalletChainId1)
	const estimateGas = getEstimateGasInjects()

	const orderFiller = new BatchOrderFiller(ethereum1, send1, estimateGas, config, apis, getBaseOrderFee, env)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
		exchangeWrapper: deployTestExchangeWrapper(web3),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		exchangeV2: deployTestExchangeV2(web3),
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

		await sentTx(it.transferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})
		await sentTx(it.erc20TransferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), {
			from: sender1Address,
		})
		await sentTx(
			it.exchangeWrapper.methods.__ExchangeWrapper_init(
				ZERO_ADDRESS,
				it.exchangeV2.options.address,
			),
			{ from: sender1Address }
		)
		config.exchange.wrapper = toAddress(it.exchangeWrapper.options.address)
		config.exchange.v1 = toAddress(it.exchangeV2.options.address)
		config.exchange.v2 = toAddress(it.exchangeV2.options.address)
		config.transferProxies.erc20 = toAddress(it.erc20TransferProxy.options.address)
		config.exchange.wrapper = toAddress(it.exchangeWrapper.options.address)
		config.chainId = 17
	})

	function getOrder(asset: Asset, owner: Address): SimpleRaribleV2Order {
		if (asset.assetType.assetClass !== "ERC721" && asset.assetType.assetClass !== "ERC1155") {
			throw new Error("Wrong asset")
		}
		return  {
			make: {
				assetType: {
					assetClass: asset.assetType.assetClass,
					contract: toAddress(asset.assetType.contract),
					tokenId: toBigNumber(asset.assetType.tokenId),
				},
				value: toBigNumber(asset.value),
			},
			maker: owner,
			taker: ZERO_ADDRESS,
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
	}

	async function mintTestAssetAndReturnOrder(
		asset: Asset, sender: Address, receiver: Address
	): Promise<SimpleRaribleV2Order> {
		switch (asset.assetType.assetClass) {
			case "ERC721": {
				await sentTx(it.testErc721.methods.mint(receiver, asset.assetType.tokenId, "0x"), { from: sender })
				await sentTx(it.testErc721.methods.setApprovalForAll(it.transferProxy.options.address, true), {
					from: receiver,
				})
				break
			}
			case "ERC1155": {
				await sentTx(it.testErc1155.methods.mint(receiver, asset.assetType.tokenId, toBn(asset.value).multipliedBy(10), "0x"), { from: sender })
				await sentTx(it.testErc1155.methods.setApprovalForAll(it.transferProxy.options.address, true), {
					from: receiver,
				})
				break
			}
			default:
		}
		const order = getOrder(asset, receiver)
		return { ...order, signature: await signOrder(ethereum2, config, order) }
	}

	async function getBalance(assetType: "ERC721" | "ERC1155", userAddress: Address, tokenId?: string): Promise<BigNumber> {
		switch (assetType) {
			case "ERC721": {
				return toBn(await it.testErc721.methods.balanceOf(userAddress).call())
			}
			case "ERC1155": {
				return toBn(await it.testErc1155.methods.balanceOf(userAddress, tokenId).call())
			}
			default: throw new Error("Should never heppen")
		}
	}

	test("Match batch of rarible-v2 orders", async () => {
		const tokenIds = ["3", "4", "5"]

		const order1 = await mintTestAssetAndReturnOrder({
			assetType: {
				assetClass: "ERC1155",
				contract: toAddress(it.testErc1155.options.address),
				tokenId: toBigNumber(tokenIds[0]),
			},
			value: toBigNumber("2"),
		}, sender1Address, sender2Address)

		const order2 = await mintTestAssetAndReturnOrder({
			assetType: {
				assetClass: "ERC1155",
				contract: toAddress(it.testErc1155.options.address),
				tokenId: toBigNumber(tokenIds[1]),
			},
			value: toBigNumber("2"),
		}, sender1Address, sender2Address)

		const order3 = await mintTestAssetAndReturnOrder({
			assetType: {
				assetClass: "ERC721",
				contract: toAddress(it.testErc721.options.address),
				tokenId: toBigNumber(tokenIds[2]),
			},
			value: toBigNumber("1"),
		}, sender1Address, sender2Address)

		const beforeBuyerNftBalance1 = await getBalance("ERC1155", sender1Address, tokenIds[0])
		const beforeBuyerNftBalance2 = await getBalance("ERC1155", sender1Address, tokenIds[1])
		const beforeBuyerNftBalance3 = await getBalance("ERC721", sender1Address)
		const beforeSellerNftBalance1 = await getBalance("ERC1155", sender2Address, tokenIds[0])
		const beforeSellerNftBalance2 = await getBalance("ERC1155", sender2Address, tokenIds[1])
		const beforeSellerNftBalance3 = await getBalance("ERC721", sender2Address)

		const tx = await orderFiller.buy([
			{ order: order1, amount: 1 }, //ERC1155 partial fill
			{ order: order2, amount: 2 },
			{ order: order3, amount: 1 },
		])
		await tx.wait()

		//seller balances
		expect((await getBalance("ERC1155", sender2Address, tokenIds[0])).toString()).toBe(
			beforeSellerNftBalance1.minus(1).toFixed()
		)
		expect((await getBalance("ERC1155", sender2Address, tokenIds[1])).toString()).toBe(
			beforeSellerNftBalance2.minus(2).toFixed()
		)
		expect((await getBalance("ERC721", sender2Address)).toString()).toBe(
			beforeSellerNftBalance3.minus(1).toFixed()
		)

		//buyer balances
		expect((await getBalance("ERC1155", sender1Address, tokenIds[0])).toString()).toBe(
			beforeBuyerNftBalance1.plus(1).toFixed()
		)
		expect((await getBalance("ERC1155", sender1Address, tokenIds[1])).toString()).toBe(
			beforeBuyerNftBalance2.plus(2).toFixed()
		)
		expect((await getBalance("ERC721", sender1Address)).toString()).toBe(
			beforeBuyerNftBalance3.plus(1).toFixed()
		)
	})
})
