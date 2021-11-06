import * as common from "@rarible/ethereum-sdk-test-common"
import { ethers } from "ethers"
import Web3 from "web3"
import type { Ethereum } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { EthersEthereum, EthersWeb3ProviderEthereum } from "./index"

const testPK = "d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469"

const { provider } = common.createGanacheProvider(testPK)
const web3 = new Web3(provider as any)
const web3Provider = new ethers.providers.Web3Provider(provider as any)
const ethereum = new EthersWeb3ProviderEthereum(web3Provider)
const wallet = new ethers.Wallet(testPK, web3Provider)
const etheresEthereum = new EthersEthereum(wallet)

const data = [
	ethereum,
	etheresEthereum,
]

describe.each(data)("ethers.js Ethereum", (eth: Ethereum) => {

	test(`${eth.constructor.name} signs typed data correctly`, async () => {
		await common.testTypedSignature(eth)
	})

	test(`${eth.constructor.name} signs personal message correctly`, async () => {
		await common.testPersonalSign(eth)
	})

	test(`${eth.constructor.name} allows to send transactions and call functions`, async () => {
		await common.testSimpleContract(web3, eth)
	})

	test(`${eth.constructor.name} should return balance`, async () => {
		const sender = toAddress(await eth.getFrom())
		expect(await eth.getBalance(sender)).toBeTruthy()
	})
})
