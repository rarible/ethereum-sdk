import { createGanacheProvider, testPersonalSign } from "@rarible/ethereum-sdk-test-common"
import { ethers } from "ethers"
import { testTypedSignature } from "../../test-common/src/test-typed-signature"
import { EthersEthereum } from "./index"

describe("EthersEthereum", () => {
	const { provider } = createGanacheProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	const eth = new ethers.providers.Web3Provider(provider as any)

	it("signs typed data correctly", async () => {
		await testTypedSignature(new EthersEthereum(eth))
	})

	it("signs personal message correctly", async () => {
		await testPersonalSign(new EthersEthereum(eth))
	})
})
