// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { randomAddress, toAddress } from "@rarible/types"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { sentTx } from "../common/send-transaction"
import { approveErc721 } from "./approve-erc721"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { awaitAll } from "../common/await-all"

describe("approveErc721", () => {
	const { provider, addresses } = createGanacheProvider()
	const web3 = new Web3(provider as any)
	const ethereum = new Web3Ethereum({ web3 })
	const [from] = addresses

	const it = awaitAll({
		testErc721: deployTestErc721(web3, "TST", "TST")
	})

	test("should approve", async () => {
		const tokenId = from + "b00000000000000000000001"
		await it.testErc721.methods.mint(from, tokenId, 'https://example.com').send({ from, gas: 200000 })

		const operator = randomAddress()
		await approveErc721(ethereum, toAddress(it.testErc721.options.address), from, operator)

		const result: boolean = await it.testErc721.methods.isApprovedForAll(from, operator).call()
		expect(result).toBeTruthy()
	})

	test("should not approve", async () => {
		const tokenId = from + "b00000000000000000000002"
		await it.testErc721.methods.mint(from, tokenId, 'https://example.com').send({ from, gas: 200000 })

		const operator = randomAddress()
		await sentTx(it.testErc721.methods.setApprovalForAll(operator, true), { from })
		const result = await approveErc721(ethereum, toAddress(it.testErc721.options.address), from, operator)

		expect(result === undefined).toBeTruthy()
	})

})
