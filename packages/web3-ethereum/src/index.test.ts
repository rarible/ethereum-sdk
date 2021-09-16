import Web3 from "web3"
import {
	createE2eProvider,
	createGanacheProvider,
	testPersonalSign,
	testSimpleContract,
	testTypedSignature,
} from "@rarible/ethereum-sdk-test-common"
import { recoverPersonalSignature } from "eth-sig-util"
import { parseRequestError } from "./utils/parse-request-error"
import { Web3Ethereum } from "./index"

describe("Web3Ethereum", () => {
	const { provider } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	const e2eEthereum = new Web3Ethereum({ web3: new Web3(provider as any) })

	const { provider: ganache } = createGanacheProvider()
	const web3 = new Web3(ganache as any)
	const ganacheEthereum = new Web3Ethereum({ web3 })

	test("signs typed data correctly", async () => {
		await testTypedSignature(e2eEthereum)
	})

	test("signs personal message correctly", async () => {
		await testPersonalSign(e2eEthereum)
	})

	test("should correctly parse error for invalid method request", async () => {
		let ok = false
		try {
			await e2eEthereum.send("unknown method", [])
			ok = true
		} catch (err) {
			const error = parseRequestError(err)
			expect(error?.code).toEqual(-32601)
		}
		expect(ok).toBeFalsy()
	})

	test("allows to send transactions and call functions", async () => {
		await testSimpleContract(web3, ganacheEthereum)
	})

	test("ethSign works", async () => {
		const data = "0xab4bd7e6f7d4ed647c43cd5b612660d8ee3c9aebdd1a323690b2b0ef48989906"
		const sig = await ganacheEthereum.ethSign(data)
		console.log("signature is", sig, await ganacheEthereum.getFrom())
		const recovered = recoverPersonalSignature({ sig, data })
		expect(recovered)
			.toBe((await ganacheEthereum.getFrom()).toLowerCase())
	})

})
