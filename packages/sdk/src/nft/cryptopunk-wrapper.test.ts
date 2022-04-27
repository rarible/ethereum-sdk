import {
	awaitAll,
	createGanacheProvider,
	deployCryptoPunksMarketV1,
	deployCryptoPunksWrapper,
} from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { Configuration, GatewayControllerApi } from "@rarible/ethereum-api-client"
import { getApiConfig } from "../config/api-config"
import { getEthereumConfig } from "../config"
import { checkChainId } from "../order/check-chain-id"
import { getSendWithInjects, sentTx } from "../common/send-transaction"
import { approveForWrapper, unwrapPunk, wrapPunk } from "./cryptopunk-wrapper"

describe("wrap crypto punk", () => {
	const { provider, addresses } = createGanacheProvider()
	const configuration = new Configuration(getApiConfig("e2e"))
	const gatewayApi = new GatewayControllerApi(configuration)

	const config = getEthereumConfig("e2e")

	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)
	const send = getSendWithInjects().bind(null, gatewayApi, checkWalletChainId)

	const it = awaitAll({
		punksMarket: deployCryptoPunksMarketV1(web3),
		punksWrapper: deployCryptoPunksWrapper(web3),
	})

	const punkId = 3490

	test.skip("should wrap cryptopunk", async () => {
		console.log("market:", (it.punksMarket as any)._address)
		console.log("wrapper:", (it.punksWrapper as any)._address)

		await sentTx(it.punksMarket.methods.getPunk(punkId), {from: addresses[0]})

		console.log(addresses[0], await it.punksMarket.methods.punkIndexToAddress(punkId).call())

		try {
			const apTx = await approveForWrapper(
				ethereum,
				send,
				checkWalletChainId,
				(it.punksMarket as any)._address, // config.cryptoPunks.marketContract,
				(it.punksWrapper as any)._address, // config.cryptoPunks.wrapperContract,
				punkId
			)

			if (apTx) {
				await apTx.wait()
				expect(apTx.hash).toBeTruthy()
			}
		} catch (e) { console.log ("skip approve", e) }

		const wrapTx = await wrapPunk(
			ethereum,
			send,
			checkWalletChainId,
			(it.punksWrapper as any)._address, // config.cryptoPunks.wrapperContract,
			punkId,
		)

		await wrapTx.wait()
		console.log(wrapTx.hash)
		expect(wrapTx.hash).toBeTruthy()
	})

	test.skip("should unwrap cryptopunk", async () => {
		const tx = await unwrapPunk(
			ethereum,
			send,
			checkWalletChainId,
			(it.punksWrapper as any)._address, // config.cryptoPunks.wrapperContract,
			punkId,
		)

		await tx.wait()

		expect(tx.hash).toBeTruthy()
	})
})
