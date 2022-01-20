import Web3 from "web3"
import * as common from "@rarible/ethereum-sdk-test-common"
import { parseRequestError } from "./utils/parse-request-error"
import { Web3Ethereum } from "./index"

describe("Web3Ethereum", () => {
	const { provider } = common.createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	const e2eEthereum = new Web3Ethereum({ web3: new Web3(provider as any) })

	const { provider: ganache } = common.createGanacheProvider()
	const web3 = new Web3(ganache as any)
	const ganacheEthereum = new Web3Ethereum({ web3 })

	test("signs typed data correctly", async () => {
		await common.testTypedSignature(e2eEthereum)
	})

	test("signs personal message correctly", async () => {
		await common.testPersonalSign(e2eEthereum)
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
		await common.testSimpleContract(web3, ganacheEthereum)
	})

	test("getNetwork", async () => {
		const network = await e2eEthereum.getChainId()
		expect(network).toBe(17)
	})
})
