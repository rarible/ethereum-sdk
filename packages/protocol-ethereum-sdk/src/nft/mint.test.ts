import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { EthereumContract } from "@rarible/ethereum-provider"
import { toBigNumber } from "@rarible/types/build/big-number"
import { toAddress } from "@rarible/types/build/address"
import { Contract } from "web3-eth-contract"
import { deployTestErc721 } from "../order/contracts/test/test-erc721"
import { createErc721Contract } from "../order/contracts/erc721"
import { createErc1155Contract } from "../order/contracts/erc1155"
import { mintErc1155 } from "./mint-erc1155"
import { mintErc721 } from "./mint-erc721"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"

describe("mint test", () => {
	const { provider, addresses } = createGanacheProvider()
	let testErc721: Contract
	let testErc1155: Contract
	const [minter] = addresses
	// @ts-ignore
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3, from: minter, gas: 0 })
	let contract: EthereumContract
	beforeAll(async () => {
		testErc721 = await deployTestErc721(web3, "TEST", "TEST")
		testErc1155 = await deployTestErc1155(web3, "TST")
	})
	test("mint Erc721", async () => {
		contract = createErc721Contract(ethereum, toAddress(testErc721.options.address))
		await mintErc721(ethereum, contract, minter, minter, "uri", toBigNumber("1"))
		const balanceOfMinter = await contract.functionCall('balanceOf', minter).call()
		expect(balanceOfMinter).toBe("1")
	}, 20000)
	test("mint Erc1155", async () => {
		contract = createErc1155Contract(ethereum, toAddress(testErc1155.options.address))
		await mintErc1155(ethereum, contract, minter, minter, Buffer.from("data", "hex"), toBigNumber("2"), 100)
		const balanceOfMinter: string = await contract.functionCall('balanceOf', minter, "2").call()
		expect(balanceOfMinter).toBe("100")
	})
})
