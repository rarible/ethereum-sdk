// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { randomAddress, toAddress } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { sentTx } from "../common/send-transaction"
import { approveErc721 } from "./approve-erc721"
import { deployTestErc721 } from "./contracts/test/test-erc721"

describe("approveErc721", () => {
	const {
		provider,
		addresses,
	} = createGanacheProvider("d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469")
	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum(web3)
	const [testAddress] = addresses
	let testErc721: Contract

	beforeAll(async () => {
		testErc721 = await deployTestErc721(web3, "TST", "TST")
	})

	test("should approve", async () => {
		const tokenId = testAddress + "b00000000000000000000001"
		await testErc721.methods.mint(testAddress, tokenId, 'https://example.com').send({ from: testAddress, gas: 200000 })

		const operator = randomAddress()
		await approveErc721(ethereum, toAddress(testErc721.options.address), testAddress, operator)

		const result: boolean = await testErc721.methods.isApprovedForAll(testAddress, operator).call()
		expect(result).toBeTruthy()
	})

	test("should not approve", async () => {
		const tokenId = testAddress + "b00000000000000000000002"
		await testErc721.methods.mint(testAddress, tokenId, 'https://example.com').send({ from: testAddress, gas: 200000 })

		const operator = randomAddress()
		await sentTx(testErc721.methods.setApprovalForAll(operator, true), { from: testAddress })
		const result = await approveErc721(ethereum, toAddress(testErc721.options.address), testAddress, operator)

		expect(result === undefined).toBeTruthy()
	})

})
