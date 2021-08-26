import { randomAddress, randomWord } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import { CreateTransactionRequest, LogEvent } from "@rarible/protocol-api-client/build/models"
import { CreateGatewayPendingTransactionsRequest } from "@rarible/protocol-api-client/build/apis/GatewayControllerApi"
import { GatewayControllerApi } from "@rarible/protocol-api-client"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { deployTestErc20 } from "../order/contracts/test/test-erc20"
import { createPendingLogs, sendTransaction } from "./send-transaction"
import { simpleSend } from "./simple-send"

describe("sendTransaction", () => {
	const { provider, addresses } = createGanacheProvider()
	// @ts-ignore
	const web3 = new Web3(provider)
	const [testAddress] = addresses

	let testErc20: Contract

	beforeAll(async () => {
		testErc20 = await deployTestErc20(web3, "TST", "TST")
	})

	test("call notify", async () => {
		let notified: string | null = null
		const notify = async (hash: string) => {
			notified = hash
		}
		const address = randomAddress()

		const result = await sendTransaction(notify, testErc20.methods.mint(address, 100), { from: testAddress })

		expect(notified).toBeTruthy()
		expect(result).toBe(notified)
	})

	test("createPendingLogs is invoked", async () => {
		const address = randomAddress()
		const hash = await simpleSend(testErc20.methods.mint(address, 100), { from: testAddress })

		const tx = await web3.eth.getTransaction(hash)
		let notified: CreateTransactionRequest | null = null
		// noinspection JSUnusedGlobalSymbols
		const api = {
			createGatewayPendingTransactions(
				requestParameters: CreateGatewayPendingTransactionsRequest
			): Promise<Array<LogEvent>> {
				notified = requestParameters.createTransactionRequest
				return Promise.resolve([
					{
						transactionHash: randomWord(),
						status: "PENDING",
						address: randomAddress(),
						topic: randomWord(),
					},
				])
			},
		}
		const logs = await createPendingLogs(api as GatewayControllerApi, web3, hash)
		expect(logs.length).toBe(1)
		expect(notified).toBeTruthy()
		expect(notified!.hash).toBe(tx.hash.toLowerCase())
		expect(notified!.from).toBe(tx.from.toLowerCase())
	})
})
