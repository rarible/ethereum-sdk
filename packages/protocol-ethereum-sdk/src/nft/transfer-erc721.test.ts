import { randomAddress, toAddress } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import { Address } from "@rarible/protocol-api-client"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import { sentTx } from "../common/send-transaction"
import { deployTestErc721 } from "../order/contracts/test/test-erc721"
import { transferErc721 } from "./transfer-erc721"
import Web3 from "web3"

describe("transfer Erc721", () => {
	const { provider, addresses } = createGanacheProvider()
	// @ts-ignore
	const web3 = new Web3(provider)
	const [testAddress] = addresses
	let testErc721: Contract
	let from = testAddress
	let to = randomAddress()

	beforeAll(async () => {
		testErc721 = await deployTestErc721(web3, "TST", "TST")
	})

	test(`should transfer erc721 token from: ${from}, to: ${to}`, async () => {
		const tokenId1: string = from + "b00000000000000000000001"
		await testErc721.methods.mint(from, tokenId1, 'https://nft.com').send({ from, gas: 200000 })

		const senderBalance = await testErc721.methods.balanceOf(from).call()
		expect(senderBalance === '1').toBeTruthy()

		const ownership: Address = await testErc721.methods.ownerOf(tokenId1).call()
		expect(toAddress(ownership) === toAddress(from)).toBeTruthy()

		await testErc721.methods.setApprovalForAll(to, true)
		const isApproved: boolean = await testErc721.methods.isApprovedForAll(from, to)
		expect(isApproved).toBeTruthy()

		const hash = await transferErc721(sentTx, web3, toAddress(testErc721.options.address), from, to, tokenId1)
		expect(!!hash).toBeTruthy()

		const receiverOwnership = await testErc721.methods.ownerOf(tokenId1).call()
		expect(toAddress(receiverOwnership) === toAddress(to)).toBeTruthy()

		const resultSenderBalance = await testErc721.methods.balanceOf(testAddress).call()
		expect(resultSenderBalance === '0').toBeTruthy()

		const resultReceiverBalance = await testErc721.methods.balanceOf(to).call()
		expect(resultReceiverBalance === '1').toBeTruthy()
	})

	test(`should throw ownership error`, async () => {
		const tokenId2: string = from + "b00000000000000000000002"
		await testErc721.methods.mint(from, tokenId2, 'https://nft.com').send({ from, gas: 200000 })
		const senderBalance = await testErc721.methods.balanceOf(from).call()
		expect(senderBalance === '1').toBeTruthy()

		const ownership: Address = await testErc721.methods.ownerOf(tokenId2).call()
		expect(toAddress(ownership) === toAddress(from)).toBeTruthy()

		const hash = await transferErc721(sentTx, web3, toAddress(testErc721.options.address), randomAddress(), to, tokenId2)
		expect(!!hash).toBeFalsy()
	})

})
