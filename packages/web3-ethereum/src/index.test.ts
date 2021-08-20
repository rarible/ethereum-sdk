import Web3 from "web3"
import { createE2eProvider, testPersonalSign } from "@rarible/ethereum-sdk-test-common"
import { testTypedSignature } from '../../test-common/src/test-typed-signature'
import { Web3Ethereum } from "./index"

describe("Web3Ethereum", () => {
	const { provider } = createE2eProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	// @ts-ignore
	const web3 = new Web3(provider)
	const eth = new Web3Ethereum({ web3 })

	it("signs typed data correctly", async () => {
		await testTypedSignature(eth)
	})

	it("signs personal message correctly", async () => {
		await testPersonalSign(eth)
	})
})
