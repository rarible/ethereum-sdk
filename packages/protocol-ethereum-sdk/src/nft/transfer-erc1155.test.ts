import { randomAddress, toAddress } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"
import { transferErc1155 } from "./transfer-erc1155"

describe("transfer Erc1155", () => {
	const { provider, addresses } = createGanacheProvider()
	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const [testAddress] = addresses
	let testErc1155: Contract
	let from = testAddress
	let to = randomAddress()

	beforeAll(async () => {
		testErc1155 = await deployTestErc1155(web3, "TST")
	})
	test('should transfer erc1155 token', async () => {
		const token1Id = testAddress + "b00000000000000000000001"
		const token1Balance = '10'
		await testErc1155.methods.mint(from, token1Id, token1Balance, '123').send({ from: from, gas: 200000 })

		const senderBalance: string = await testErc1155.methods.balanceOf(from, token1Id).call()
		expect(senderBalance === token1Balance).toBeTruthy()

		const hash = await transferErc1155(ethereum, toAddress(testErc1155.options.address), from, to, token1Id, '5')
		expect(!!hash).toBeTruthy()

		const senderResultBalance: string = await testErc1155.methods.balanceOf(from, token1Id).call()
		expect(senderResultBalance === '5').toBeTruthy()

		const receiverBalance: string = await testErc1155.methods.balanceOf(to, token1Id).call()
		expect(receiverBalance === '5').toBeTruthy()
	})

	test(`should transfer batch of erc1177`, async () => {
		const [token2Id, token3Id, token4Id]: string[] = [
			from + "b00000000000000000000002",
			from + "b00000000000000000000003",
			from + "b00000000000000000000004",
		]
		const [token2Balance, token3Balance, token4Balance]: string[] = ['100', '200', '300']
		await testErc1155.methods.mint(from, token2Id, token2Balance, '123').send({ from: from, gas: 200000 })
		await testErc1155.methods.mint(from, token3Id, token3Balance, '123').send({ from: from, gas: 200000 })
		await testErc1155.methods.mint(from, token4Id, token4Balance, '123').send({ from: from, gas: 200000 })

		const [
			token2Balances,
			token3Balances,
			token4Balances,
		] = [
			await testErc1155.methods.balanceOfBatch([from, to], [token2Id, token2Id]).call(),
			await testErc1155.methods.balanceOfBatch([from, to], [token3Id, token3Id]).call(),
			await testErc1155.methods.balanceOfBatch([from, to], [token4Id, token4Id]).call(),
		]
		expect(token2Balances).toEqual(['100', '0'])
		expect(token3Balances).toEqual(['200', '0'])
		expect(token4Balances).toEqual(['300', '0'])

		const hash = await transferErc1155(
			ethereum,
			toAddress(testErc1155.options.address),
			from,
			to,
			[token2Id, token3Id, token4Id],
			['10', '100', '300'])
		expect(!!hash).toBeTruthy()

		const [
			resultToken2Balances,
			resultToken3Balances,
			resultToken4Balances,
		] = [
			await testErc1155.methods.balanceOfBatch([from, to], [token2Id, token2Id]).call(),
			await testErc1155.methods.balanceOfBatch([from, to], [token3Id, token3Id]).call(),
			await testErc1155.methods.balanceOfBatch([from, to], [token4Id, token4Id]).call(),
		]

		expect(resultToken2Balances).toEqual(['90', '10'])
		expect(resultToken3Balances).toEqual(['100', '100'])
		expect(resultToken4Balances).toEqual(['0', '300'])
	})

	test(`the transferErc1155 should return undefined,
    because the length of identifiers and quantities,
    the parameters of the sum do not match`,
		async () => {
			const [token2Id, token3Id]: string[] = [
				from + "b00000000000000000000005",
				from + "b00000000000000000000006",
			]
			const [token2Balance, token3Balance]: string[] = ['100', '100']
			await testErc1155.methods.mint(from, token2Id, token2Balance, '123').send({ from: from, gas: 200000 })
			await testErc1155.methods.mint(from, token3Id, token3Balance, '123').send({ from: from, gas: 200000 })

			const [
				token2Balances,
				token3Balances,
			] = [
				await testErc1155.methods.balanceOfBatch([from, to], [token2Id, token2Id]).call(),
				await testErc1155.methods.balanceOfBatch([from, to], [token3Id, token3Id]).call(),
			]
			expect(token2Balances).toEqual(['100', '0'])
			expect(token3Balances).toEqual(['100', '0'])
			expect.assertions(3)
			try {
				await transferErc1155(
					ethereum,
					toAddress(testErc1155.options.address),
					from,
					to,
					[token2Id, token3Id],
					['50', '50', '10'])
			} catch (e) {
				expect(e.message).toEqual("Length of token amounts and token id's isn't equal")
			}
		})
})
