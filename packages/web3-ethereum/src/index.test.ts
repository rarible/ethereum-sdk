import Web3 from "web3"
import { createE2eProvider, testTypedSignature, testPersonalSign } from "@rarible/ethereum-sdk-test-common"
import { parseRequestError } from "./utils/parse-request-error"
import { Web3Ethereum } from "./index"

describe("Web3Ethereum", () => {
	const { provider } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	const web3 = new Web3(provider as any)
	const eth = new Web3Ethereum({ web3 })

	it("signs typed data correctly", async () => {
		await testTypedSignature(eth)
	})

	it("signs personal message correctly", async () => {
		await testPersonalSign(eth)
	})

	it("should correctly parse error for invalid method request", async () => {
        await eth.send("unknown method", []).catch((err) => {
			const error = parseRequestError(err)
			expect(error?.type).toEqual("rpc")
			expect(error?.reason.code).toEqual(-32601)
		})
	})
})
