import {
	createGanacheProvider,
	testPersonalSign,
	testSimpleContract,
	testTypedSignature,
} from "@rarible/ethereum-sdk-test-common"
import { ethers } from "ethers"
import Web3 from "web3"
import { recoverPersonalSignature } from "eth-sig-util"
import { EthersEthereum } from "./index"

describe("EthersEthereum", () => {
	const { provider } = createGanacheProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	const web3 = new Web3(provider as any)
	const ethereum = new EthersEthereum(new ethers.providers.Web3Provider(provider as any))

	test("signs typed data correctly", async () => {
		await testTypedSignature(ethereum)
	})

	test("signs personal message correctly", async () => {
		await testPersonalSign(ethereum)
	})

	test("allows to send transactions and call functions", async () => {
		await testSimpleContract(web3, ethereum)
	})

	test("ethSign works", async () => {
		const data = "0xab4bd7e6f7d4ed647c43cd5b612660d8ee3c9aebdd1a323690b2b0ef48989906"
		const sig = await ethereum.ethSign(data)
		console.log("signature is", sig, await ethereum.getFrom())
		const recovered = recoverPersonalSignature({ sig, data })
		expect(recovered)
			.toBe((await ethereum.getFrom()).toLowerCase())
	})
})
