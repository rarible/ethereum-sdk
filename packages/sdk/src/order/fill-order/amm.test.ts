import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum/build"
import { createRaribleSdk } from "../../index"
import { getEthereumConfig } from "../../config"
import { getSimpleSendWithInjects } from "../../common/send-transaction"
import { checkChainId } from "../check-chain-id"
import { retry } from "../../common/retry"
import type { SimpleOrder } from "../types"
import { mintTokensToNewSudoswapPool } from "./amm/test/utils"

describe("amm", () => {
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

	test("try to fill order", async () => {
		const pair = await mintTokensToNewSudoswapPool(sdkBuyer, buyerWeb3, send, config.sudoswap.pairFactory, 1)
		console.log(pair)
		const orderHash = "0x" + pair.poolAddress.slice(2).padStart(64, "0")
		console.log("order:", orderHash)
		const singleOrder: SimpleOrder = await retry(20, 2000, async () => {
			return await sdkBuyer.apis.order.getOrderByHash({hash: orderHash})
		})
		console.log("single order", singleOrder)

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
