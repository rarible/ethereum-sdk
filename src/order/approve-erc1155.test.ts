// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { randomAddress, toAddress } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import { deployTestErc1155 } from "./contracts/test-erc1155"
import { approveErc1155 } from "./approve-erc1155"
import { toBn } from "../common/to-bn"
import { sentTx } from "../common/send-transaction"
import { createGanacheProvider } from "../test/create-ganache-provider"

describe("approveErc1155", () => {
    const { web3, address: testAddress } = createGanacheProvider()

    let testErc1155: Contract
    beforeAll(async () => {
        testErc1155 = await deployTestErc1155(web3, "TST")
    })

    test("should approve", async () => {
        const tokenId = testAddress + "b00000000000000000000003"
        await testErc1155.methods.mint(testAddress, tokenId, toBn(1), '123').send({ from: testAddress, gas: 200000 })

        const balance = await testErc1155.methods.balanceOf(testAddress, tokenId).call();
        expect(balance).toEqual("1");

        const operator = randomAddress()
        await approveErc1155(sentTx, web3, toAddress(testErc1155.options.address), testAddress, operator)

        const result: boolean = await testErc1155.methods.isApprovedForAll(testAddress, operator).call()
        expect(result).toBeTruthy()
    })

    test("should not approve", async () => {
        const tokenId = testAddress + "b00000000000000000000002"
        await testErc1155.methods.mint(testAddress, tokenId, toBn(5), '123').send({ from: testAddress, gas: 200000 })

        const balance = await testErc1155.methods.balanceOf(testAddress, tokenId).call();
        expect(balance).toEqual("5");

        const operator = randomAddress()
        await sentTx(testErc1155.methods.setApprovalForAll(operator, true), { from: testAddress })
        const result = await approveErc1155(sentTx, web3, toAddress(testErc1155.options.address), testAddress, operator)

        expect(result === undefined).toBeTruthy()
    })

})
