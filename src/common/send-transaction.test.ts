import { createPendingLogs, sendTransaction } from "./send-transaction"
import Wallet from "ethereumjs-wallet"
import { randomAddress, randomWord, toAddress } from "@rarible/types"
import Ganache from "ganache-core"
import Web3 from "web3"
import { Contract } from "web3-eth-contract"
import { deployTestErc20 } from "../order/contracts/test-erc20"
import { simpleSend } from "./simple-send"
import { CreateTransactionRequest, LogEvent } from "@rarible/protocol-api-client/build/models"
import { CreateGatewayPendingTransactionsRequest } from "@rarible/protocol-api-client/build/apis/GatewayControllerApi"
import { GatewayControllerApi } from "@rarible/protocol-api-client"

const testPK = "846b79108c721af4d0ff7248f4a10c65e5a7087532b22d78645c576fadd80b7f"
const testWallet = new Wallet(Buffer.from(testPK, "hex"))
const testAddress = toAddress(testWallet.getAddressString())

describe("sendTransaction", () => {
	const provider = Ganache.provider({
		accounts: [{ secretKey: Buffer.from(testPK, "hex"), balance: "0x1000000000000000000000000000" }],
	})
	// @ts-ignore
	const web3 = new Web3(provider)
	let testErc20: Contract

	beforeAll(async () => {
		testErc20 = await deployTestErc20(web3, "TST", "TST")
	})

	test("call notify", async () => {
		let notified: string | null = null
		const notify = async (hash: string) => {
			notified = hash
			return `hash-${hash}`
		}
		const address = randomAddress()

		const result = await sendTransaction(notify, testErc20.methods.mint(address, 100), { from: testAddress })

		expect(notified).toBeTruthy()
		expect(result).toBe(`hash-${notified}`)
	})

	test("createPendingLogs is invoked", async () => {
		const address = randomAddress()
		const hash = await simpleSend(testErc20.methods.mint(address, 100), { from: testAddress })

		const tx = await web3.eth.getTransaction(hash)
		let notified: CreateTransactionRequest | null = null
		// noinspection JSUnusedGlobalSymbols
		const api = {
			createGatewayPendingTransactions(requestParameters: CreateGatewayPendingTransactionsRequest): Promise<Array<LogEvent>> {
				notified = requestParameters.createTransactionRequest
				return Promise.resolve([{
					transactionHash: randomWord(),
					status: "PENDING",
					address: randomAddress(),
					topic: randomWord()
				}])
			}
		}
		const logs = await createPendingLogs(api as GatewayControllerApi, web3, hash)
		expect(logs.length).toBe(1)
		expect(notified).toBeTruthy()
		expect(notified!.hash).toBe(tx.hash.toLowerCase())
		expect(notified!.from).toBe(tx.from.toLowerCase())
	})

	afterAll(() => {
		provider.close(() => {})
	})
})
