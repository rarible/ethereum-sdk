import { randomAddress, toAddress } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import { Address } from "@rarible/protocol-api-client"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { deployTestErc721 } from "../order/contracts/test/test-erc721"
import { transferErc721 } from "./transfer-erc721"

describe("transfer Erc721", () => {
	const { provider, addresses } = createGanacheProvider()
	const [testAddress] = addresses
	let from = testAddress
	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })

	let testErc721: Contract
	let to = randomAddress()

	beforeAll(async () => {
		testErc721 = await deployTestErc721(web3, "TST", "TST")
	})

	test('should transfer erc721 token', async () => {
		const tokenId1: string = from + "b00000000000000000000001"
		await testErc721.methods.mint(from, tokenId1, 'https://nft.com').send({ from, gas: 200000 })

		const senderBalance = await testErc721.methods.balanceOf(from).call()
		expect(senderBalance === '1').toBeTruthy()

		const ownership: Address = await testErc721.methods.ownerOf(tokenId1).call()
		expect(toAddress(ownership) === toAddress(from)).toBeTruthy()

		const hash = await transferErc721(ethereum, toAddress(testErc721.options.address), from, to, tokenId1)
		expect(!!hash).toBeTruthy()

		const receiverOwnership = await testErc721.methods.ownerOf(tokenId1).call()
		expect(toAddress(receiverOwnership) === toAddress(to)).toBeTruthy()
	}, 20000)

})
