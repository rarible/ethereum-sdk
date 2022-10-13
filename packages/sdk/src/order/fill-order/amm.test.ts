import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum/build"
import { createRaribleSdk } from "../../index"
import { getEthereumConfig } from "../../config"
import { getSimpleSendWithInjects } from "../../common/send-transaction"
import { checkChainId } from "../check-chain-id"
import { retry } from "../../common/retry"
import type { SimpleOrder } from "../types"
import { DEV_PK_1 } from "../../common/test/test-credentials"
import type { EthereumNetwork } from "../../types"
import { mintTokensToNewSudoswapPool } from "./amm/test/utils"

describe("amm", () => {
	const providerConfig = {
		networkId: 5,
		rpcUrl: "https://goerli-ethereum-node.rarible.com",
	}
	const { provider: providerBuyer } = createE2eProvider(
		DEV_PK_1,
		providerConfig,
	)

	const env: EthereumNetwork = "testnet"
	const config = getEthereumConfig(env)
	const buyerWeb3 = new Web3Ethereum({ web3: new Web3(providerBuyer as any), gas: 3000000 })
	const checkWalletChainId = checkChainId.bind(null, buyerWeb3, config)
	const send = getSimpleSendWithInjects().bind(null, checkWalletChainId)
	const sdkBuyer = createRaribleSdk(buyerWeb3, env)

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
