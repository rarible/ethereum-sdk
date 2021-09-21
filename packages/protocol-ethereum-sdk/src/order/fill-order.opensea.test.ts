import {
	BigNumber,
	Binary,
	randomAddress,
	randomWord,
	toAddress,
	toBigNumber,
	toBinary, toWord,
	ZERO_ADDRESS,
} from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import { toBn } from "@rarible/utils/build/bn"
import {Configuration, GatewayControllerApi, OrderControllerApi} from "@rarible/protocol-api-client"
import {Contract} from "web3-eth-contract"

import { send as sendTemplate, sentTx } from "../common/send-transaction"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { deployTransferProxy } from "./contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "./contracts/test/test-erc20-transfer-proxy"
import { deployTestExchangeV2 } from "./contracts/test/test-exchange-v2"
import { deployTestRoyaltiesProvider } from "./contracts/test/test-royalties-provider"
import { fillOrderSendTx } from "./fill-order"
import {
	convertOpenSeaOrderToSignDTO,
	hashOrder,
	hashToSign,
	signOrder,
	SimpleOpenSeaV1Order,
} from "./sign-order"
import { deployTestErc1155 } from "./contracts/test/test-erc1155"
import { getMakeFee } from "./get-make-fee"
import {deployOpenseaProxyRegistry} from "./contracts/test/opensea/test-proxy-registry"
import {deployOpenseaTestToken} from "./contracts/test/opensea/test-token"
import {deployOpenseaTokenTransferProxy} from "./contracts/test/opensea/test-token-transfer-proxy"
import {deployOpenSeaExchangeV1} from "./contracts/test/opensea/test-exchange-opensea-v1"

describe("fillOrder", () => {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address, sender2Address, senderMy] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })
	const ethereum2 = new Web3Ethereum({ web3, from: sender2Address, gas: 1000000 })

	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(ethereum1, gatewayApi)

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
		// openseaToken: deployOpenseaTestToken(web3),
	})

	let openseaExchange: Contract

	beforeAll(async () => {
		/**
         * Configuring
         */

		const openseaProxyRegistry = await deployOpenseaProxyRegistry(web3)
		const tokenTransferProxy = await deployOpenseaTokenTransferProxy(web3, openseaProxyRegistry.options.address)

		const openseaToken = await deployOpenseaTestToken(web3)

		const token1 = await deployTestErc20(web3, "Test1", "TST1")
		const token2 = await deployTestErc20(web3, "Test1", "TST2")

		const testErc721 = await deployTestErc721(web3, "Test", "TST")

		const transferProxy = await deployTransferProxy(web3)

		const erc20TransferProxy = await deployErc20TransferProxy(web3)

		openseaExchange = await deployOpenSeaExchangeV1(
			web3,
			openseaProxyRegistry.options.address,
			tokenTransferProxy.options.address,
			openseaToken.options.address,
		)

		await openseaProxyRegistry.methods.grantInitialAuthentication(openseaExchange.options.address)
	})

	test("should calculate order hash", async () => {

		await sentTx(it.testErc20.methods.mint(sender1Address, 100), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 1, 10, "0x"), { from: sender1Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress("0x4a6a5703a9796630e9fa04f5ecaf730065a7b827"),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("5"),
			},
			maker: toAddress("0x47921676a46ccfe3d80b161c7b4ddc8ed9e716b6"),
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress("0x0000000000000000000000000000000000000000"),
				},
				value: toBigNumber("10000000000000000"),
			},
			taker: toAddress("0x0000000000000000000000000000000000000000"),
			salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			start: 1627563829,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress("0x5206e78b21ce315ce284fb24cf05e0585a93b1d9"),
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("0"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress("0x5b3256965e7c3cf26e11fcaf296dfc8807c01073"),
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
		}

		const convertedOrder = convertOpenSeaOrderToSignDTO(left as any)

		console.log("convertedOrder", JSON.stringify(convertedOrder, null, "	"))
		const hashConvertedOrder = hashOrder(convertedOrder)
		const hashToSignConvertString = hashToSign(hashConvertedOrder)


		expect(hashConvertedOrder).toBe("0x0a3e8d8ecd4ce553b998f62830fdf9d266208f6fec6c06d264fe5879f6aa20a7")

		expect(hashToSignConvertString).toBe("0x666239c3d0d6cd5d12abbf3db2c7b2775cc74c4a37784df043db0cf45ffdf794")
	})

	test("should calculate buy-type order hash", async () => {

		await sentTx(it.testErc20.methods.mint(sender1Address, 100), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 1, 10, "0x"), { from: sender1Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress("0xc778417e063141139fce010982780140aa0cd5ab"),
				},
				value: toBigNumber("13000000000000000"),
			},
			maker: toAddress("0x47921676a46ccfe3d80b161c7b4ddc8ed9e716b6"),
			take: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress("0x509fd4cdaa29be7b1fad251d8ea0fca2ca91eb60"),
					tokenId: toBigNumber("110711"),
				},
				value: toBigNumber("1"),
			},
			taker: ZERO_ADDRESS,
			// makeStock: toBigNumber("10"),
			type: "OPEN_SEA_V1",
			// fill: toBigNumber("0"),
			// cancelled: false,
			salt: toWord("b445391e65f8ab6788b0a9ec0b0cd3fbc35d78668c6e7d556de6e66fd2b2c103"),
			start: 1628140271,
			end: 1628745154,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress("0x5206e78b21ce315ce284fb24cf05e0585a93b1d9"),
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("250"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress("0x5b3256965e7c3cf26e11fcaf296dfc8807c01073"),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0x23b872dd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000047921676a46ccfe3d80b161c7b4ddc8ed9e716b6000000000000000000000000000000000000000000000000000000000001b077"),
				replacementPattern: toBinary("0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary(""),
				extra: toBigNumber("0"),
			},
			// createdAt: "1628140270",
			// lastUpdateAt: "1628140270",
		}

		const convertedOrder = convertOpenSeaOrderToSignDTO(left as any)

		console.log("convertedOrder buy-type", JSON.stringify(convertedOrder, null, "	"))
		const hashConvertedOrder = hashOrder(convertedOrder)
		const hashToSignConvertString = hashToSign(hashConvertedOrder)

		console.log("hashConvertedOrder", hashConvertedOrder, "hashToSignConvertString", hashToSignConvertString)
		// expect(hashConvertedOrder).toBe("0x0a3e8d8ecd4ce553b998f62830fdf9d266208f6fec6c06d264fe5879f6aa20a7")
		//
		// expect(hashToSignConvertString).toBe("0x666239c3d0d6cd5d12abbf3db2c7b2775cc74c4a37784df043db0cf45ffdf794")
	})

	test("should match order(buy erc721 for erc20)", async () => {

		await sentTx(it.testErc20.methods.mint(sender1Address, 100), { from: sender1Address })
		await sentTx(it.testErc721.methods.mint(sender2Address, 1, "0x"), { from: sender1Address })

		const left: SimpleOpenSeaV1Order = {
			make: {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					// contract: toAddress("0x4a6a5703a9796630e9fa04f5ecaf730065a7b827"),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("1"),
			},
			maker: sender2Address,
			// maker: toAddress("0x47921676a46ccfe3d80b161c7b4ddc8ed9e716b6"),
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
					// contract: toAddress("0x0000000000000000000000000000000000000000"),
				},
				value: toBigNumber("10"),
				// value: toBigNumber("10000000000000000"),
			},
			// taker: ZERO_ADDRESS,
			// taker: toAddress("0x0000000000000000000000000000000000000000"),
			salt: randomWord(),
			// salt: toWord("7b0a53bb49afd3238b0ff50f17f3462ee070f913df3f9c434dc9aa941c184df7"),
			type: "OPEN_SEA_V1",
			// start: 1627563829,
			start: 0,
			end: 0,
			data: {
				dataType: "OPEN_SEA_V1_DATA_V1",
				exchange: toAddress(openseaExchange.options.address),
				makerRelayerFee: toBigNumber("0"),
				takerRelayerFee: toBigNumber("0"),
				makerProtocolFee: toBigNumber("0"),
				takerProtocolFee: toBigNumber("0"),
				feeRecipient: toAddress("0x5b3256965e7c3cf26e11fcaf296dfc8807c01073"),
				feeMethod: "SPLIT_FEE",
				side: "BUY",
				saleKind: "FIXED_PRICE",
				howToCall: "CALL",
				callData: toBinary("0x23b872dd00000000000000000000000047921676a46ccfe3d80b161c7b4ddc8ed9e716b60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a"),
				replacementPattern: toBinary("0x000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000000000000"),
				staticTarget: ZERO_ADDRESS,
				staticExtraData: toBinary("0x"),
				extra: toBigNumber("0"),
			},
		}

		await sentTx(it.testErc20.methods.approve(it.erc20TransferProxy.options.address, toBn(10)), {
			from: sender1Address,
		})

		await sentTx(it.testErc721.methods.setApprovalForAll(it.transferProxy.options.address, true), {
			from: sender2Address,
		})

		const a = toAddress(openseaExchange.options.address)

		const signature = await signOrder(ethereum2, { chainId: 1, exchange: { v1: a, v2: a, openseaV1: toAddress(openseaExchange.options.address) } }, left)

		console.log("sig", signature)
		await fillOrderSendTx(
			getMakeFee.bind(null, { v2: 100 }),
			ethereum1,
			send,
			{ v2: toAddress(it.exchangeV2.options.address), v1: toAddress(it.exchangeV2.options.address), openseaV1: toAddress(openseaExchange.options.address) },
			orderApi,
			{ ...left, signature },
			{ amount: 2, payouts: [], originFees: [{ account: randomAddress(), value: 100 }] }
		)

	})
})
