import {
	createGanacheProvider,
	testPersonalSign,
	testSimpleContract,
	testTypedSignature,
} from "@rarible/ethereum-sdk-test-common"
import { ethers } from "ethers"
import Web3 from "web3"
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
})
