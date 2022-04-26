import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { Configuration, GatewayControllerApi } from "@rarible/ethereum-api-client"
import { getApiConfig } from "../config/api-config"
import { getEthereumConfig } from "../config"
import { checkChainId } from "../order/check-chain-id"
import { getSendWithInjects } from "../common/send-transaction"
import { approveForWrapper, unwrapPunk, wrapPunk } from "./cryptopunk-wrapper"

describe("wrap crypto punk", () => {
	const configuration = new Configuration(getApiConfig("rinkeby"))
	const gatewayApi = new GatewayControllerApi(configuration)

	const config = getEthereumConfig("rinkeby")

	const { provider, wallet } = createE2eProvider(
		"3ce7bcc47dc0b832b83a3d6d05340e664b4e93730dccd156574463443a8d0c8b",
		{
			networkId: config.chainId,
			rpcUrl: "https://eth-rinkeby.alchemyapi.io/v2/2G2ouMyfO5kX6S_03kZCrpBxDKKAgyrM",
		}
	)

	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)
	const send = getSendWithInjects().bind(null, gatewayApi, checkWalletChainId)

	/*const it = awaitAll({
		punksMarket: deployCryptoPunks(web3),
		punksWrapper: deployCryptoPunksWrapper(web3),
	})*/

	const punkId = 3490

	test("should wrap cryptopunk", async () => {
		try {
			const apTx = await approveForWrapper(
				ethereum,
				send,
				checkWalletChainId,
				config.cryptoPunks.marketContract,
				config.cryptoPunks.wrapperContract,
				punkId
			)

			await apTx.wait()

			expect(apTx.hash).toBeTruthy()
		} catch (e) { console.log ("skip approve", e) }

		const wrapTx = await wrapPunk(
			ethereum,
			send,
			checkWalletChainId,
			config.cryptoPunks.wrapperContract,
			punkId,
		)

		await wrapTx.wait()

		expect(wrapTx.hash).toBeTruthy()
	})

	test("should unwrap cryptopunk", async () => {
		const tx = await unwrapPunk(
			ethereum,
			send,
			checkWalletChainId,
			config.cryptoPunks.wrapperContract,
			punkId,
		)

		await tx.wait()

		expect(tx.hash).toBeTruthy()
	})
})
