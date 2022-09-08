import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum/build"
import type { Address } from "@rarible/ethereum-api-client"
import { OrderStatus, Platform } from "@rarible/ethereum-api-client"
import {
	createSudoswapFactoryV1Contract,
} from "@rarible/ethereum-sdk-test-common/src/contracts/sudoswap/sudoswap-factory-v1"
import { toAddress, toBigNumber } from "@rarible/types"
import { createRaribleSdk } from "../../index"
import { getEthereumConfig } from "../../config"
import { getSimpleSendWithInjects } from "../../common/send-transaction"
import { approveErc721 } from "../approve-erc721"
import { checkChainId } from "../check-chain-id"
import { retry } from "../../common/retry"
import type { SimpleOrder } from "../types"
import { mintTestToken } from "./batch-purchase/test/common/utils"

describe.skip("amm", () => {
	const providerConfig = {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	}
	const { provider: providerBuyer } = createE2eProvider(
		"0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a",
		providerConfig,
	)

	const config = getEthereumConfig("testnet")
	const buyerWeb3 = new Web3Ethereum({ web3: new Web3(providerBuyer as any), gas: 3000000 })
	const checkWalletChainId = checkChainId.bind(null, buyerWeb3, config)
	const send = getSimpleSendWithInjects().bind(null, checkWalletChainId)
	const sdkBuyer = createRaribleSdk(buyerWeb3, "testnet")

	async function createPool(tokenContract: Address, tokensIds: string[]): Promise<Address> {
		const from = toAddress(await buyerWeb3.getFrom())

		const approveTx = await approveErc721(buyerWeb3, send, tokenContract, from, config.sudoswap.pairFactory)
		await approveTx?.wait()

		const sudoswapFactory = await createSudoswapFactoryV1Contract(buyerWeb3, config.sudoswap.pairFactory)
		const fc = sudoswapFactory.functionCall("createPairETH",
			tokenContract, //nft address
			"0x3764b9FE584719C4570725A2b5A2485d418A186E", //curve
			from, //_assetRecipient
			1, //_poolType
			"100", //_delta
			0, //_fee
			"1000", //_spotPrice
			tokensIds
		)

		const tx = await send(fc)
		const receipt = await tx.wait()
		const e = receipt.events.find((e) => e.event === "NewPair")
		if (!e) {
			throw new Error("No create pair event found")
		}
		return toAddress(e.returnValues.poolAddress)
	}

	async function mintTokensToNewPair(tokensCount: number = 1): Promise<{
		poolAddress: Address,
		contract: Address,
		items: string[]
	}> {
		const tokensPromises = []
		for (let i = 0; i < tokensCount; i++) {
			tokensPromises.push(mintTestToken(sdkBuyer))
		}
		const tokens = await Promise.all(tokensPromises)
		const contract = tokens[0].contract
		const tokensIds = tokens.map((t) => t.tokenId)
		const poolAddress = await createPool(contract, tokensIds)

		return {
			poolAddress,
			contract,
			items: tokensIds,
		}
	}

	test("try to fill order", async () => {
		const pair = await mintTokensToNewPair(1)
		console.log(pair)
		const orderHash = "0x" + pair.poolAddress.slice(2).padStart(64, "0")
		console.log("order:", orderHash)
		const singleOrder: SimpleOrder = await retry(20, 2000, async () => {
			return await sdkBuyer.apis.order.getOrderByHash({hash: orderHash})
		})
		console.log("single order", singleOrder)

		const order: SimpleOrder = await retry(10, 2000, async () => {
			const orders = await sdkBuyer.apis.order.getSellOrdersByStatus({
				status: [OrderStatus.ACTIVE],
				platform: Platform.SUDOSWAP,
			})
			expect(orders.orders.length).toBeGreaterThan(0)
			const order = orders.orders.find((o) =>
				o.hash === orderHash
			)
			if (!order) {
				throw new Error("order not found")
			}
			return order
			//return orders.orders[0]
		})
		//
		console.log(order)
		return

		// const order = {
		// 	type: "AMM",
		// 	salt: "143024" as any,
		// 	maker: toAddress("0x4c6a766e27726f084c41e2ba98d6df8e78f8e6e1"),
		// 	make: {
		// 		value: toBigNumber("1"),
		// 		assetType: {
		// 			assetClass: "ERC721",
		// 			contract: pair.contract,
		// 			tokenId: toBigNumber(pair.items[0]),
		// 		},
		// 	},
		// 	take: {
		// 		assetType: {
		// 			assetClass: "ETH",
		// 		},
		// 		value: toBigNumber("150000"),
		// 	},
		// 	data: {
		// 		dataType: "SUDOSWAP_AMM_DATA_V1",
		// 		poolAddress: pair.poolAddress,
		// 		bondingCurve: ZERO_ADDRESS,
		// 		curveType: SudoSwapCurveType.UNKNOWN,
		// 		assetRecipient: ZERO_ADDRESS,
		// 		poolType: SudoSwapPoolType.NFT,
		// 		delta: toBigNumber("100"),
		// 		fee: toBigNumber("0"),
		// 		feeDecimal: 0,
		// 	},
		// } as Order

		singleOrder.take.value = toBigNumber("1000000")

		const tx = await sdkBuyer.order.buy({
			order: singleOrder as any,
			amount: 1,
			originFees: [],
			assetType: {
				contract: pair.contract,
				tokenId: pair.items[0],
			},
		})
		console.log(tx)
		await tx.wait()
	})
})
