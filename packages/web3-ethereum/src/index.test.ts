import { createGanacheProvider, testTypedSignature } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "./index"

describe("Web3Ethereum", () => {
	const { provider } = createGanacheProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	// @ts-ignore
	const web3 = new Web3(provider)
	const eth = new Web3Ethereum(web3)

	it("signs typed data correctly", async () => {
		await testTypedSignature(eth)
	})
})
