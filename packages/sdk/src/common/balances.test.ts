import { awaitAll, createE2eProvider, deployTestErc20 } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress } from "@rarible/types"
import { Balances } from "./balances"
import { retry } from "./retry"
import { createEthereumApis } from "./apis"

describe("getBalance test", () => {
	const { provider } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3})

	const apis = createEthereumApis("e2e")

	const balances = new Balances(apis)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
	})

	test("get eth balance", async () => {
		const senderAddress = toAddress(await ethereum.getFrom())
		const balance = await balances.getBalance(senderAddress, { assetClass: "ETH" })
		expect(balance.toString()).toBe("0")
	})

	test("get erc-20 balance", async () => {
		const senderAddress = toAddress(await ethereum.getFrom())
		await it.testErc20.methods.mint(senderAddress, 1).send({
			from: senderAddress,
			gas: 200000,
		})

		const nextBalance = "0.000000000000000001"
		const balance = await retry(10, 4000, async () => {
			const balance = await balances.getBalance(senderAddress, {
				assetClass: "ERC20",
				contract: toAddress(it.testErc20.options.address),
			})
			if (balance.toString() !== nextBalance) {
				throw new Error("Unequal balances")
			}
			return balance
		})

		expect(balance.toString()).toBe(nextBalance)
	})
})
