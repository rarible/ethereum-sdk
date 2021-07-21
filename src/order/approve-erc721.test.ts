import Web3 from "web3"
// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import Ganache from "ganache-core"
import { randomAddress, toAddress } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import Wallet from "ethereumjs-wallet"
import {deployTestErc721} from "./contracts/test-erc721";
import {approveErc721} from "./approve-erc721";
import {sentTx} from "../common/send-transaction";

const testPK = "846b79108c721af4d0ff7248f4a10c65e5a7087532b22d78645c576fadd80b7f"
const testWallet = new Wallet(Buffer.from(testPK, "hex"))
const testAddress = toAddress(testWallet.getAddressString())

describe("approveErc721", () => {
    const provider = Ganache.provider({
        accounts: [{ secretKey: Buffer.from(testPK, "hex"), balance: "0x1000000000000000000000000000" }],
    })
    // @ts-ignore
    const web3 = new Web3(provider)
    let testErc721: Contract

    beforeAll(async () => {
        testErc721 = await deployTestErc721(web3, "TST", "TST")
    })

    test("should approve", async () => {
        const tokenId = testAddress + "b00000000000000000000001"
        await testErc721.methods.mint(testAddress, tokenId, 'https://example.com').send({ from: testAddress, gas: 200000 })

        const operator = randomAddress()
        await approveErc721(web3, toAddress(testErc721.options.address), testAddress, operator)

        const result: boolean = await testErc721.methods.isApprovedForAll(testAddress, operator).call()
        expect(result).toBeTruthy()
    })

    test("should not approve", async () => {
        const tokenId = testAddress + "b00000000000000000000002"
        await testErc721.methods.mint(testAddress, tokenId, 'https://example.com').send({ from: testAddress, gas: 200000 })

        const operator = randomAddress()
        await sentTx(testErc721.methods.setApprovalForAll(operator, true), { from: testAddress })
        const result = await approveErc721(web3, toAddress(testErc721.options.address), testAddress, operator)

        expect(result === undefined).toBeTruthy()
    })

})
