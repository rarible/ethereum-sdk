import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum/build"
import { toAddress, toBigNumber, toWord } from "@rarible/types"
import type { X2Y2Order } from "@rarible/ethereum-api-client"
import { createRaribleSdk } from "../../index"

// x2y2 works only on mainnet
describe("x2y2", () => {
	const providerConfig = {
		networkId: 1,
		rpcUrl: "https://node-mainnet.rarible.com",
	}
	const { provider: providerBuyer } = createE2eProvider(
		"0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a",
		providerConfig,
	)

	const buyerWeb3 = new Web3Ethereum({ web3: new Web3(providerBuyer as any), gas: 3000000 })
	const sdkBuyer = createRaribleSdk(buyerWeb3, "mainnet")

	test("try to fill order", async () => {
		const order = await sdkBuyer.apis.order.getOrderByHash({
			hash: "0x63f5861c4abbe917c9dd3869ed82918c596cab82d53a2479f143f2ac989321fb",
		})
		const tx = await sdkBuyer.order.buy({
			order: order as X2Y2Order,
			amount: 1,
			originFees: [{
				account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
				value: 100,
			}],
		})

		console.log(tx)
	})
})
