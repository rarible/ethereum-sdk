import Web3 from "web3";
import {Address} from "@rarible/protocol-api-client";
import {createErc721Contract} from "./contracts/erc721";
import {sentTx} from "../common/send-transaction";

export async function approveErc721(
    web3: Web3, contract: Address, owner: Address, operator: Address
): Promise<string | undefined> {
    const erc721 = createErc721Contract(web3, contract)
    const allowance = await erc721.methods.isApprovedForAll(owner, operator).call()
    if (!allowance) {
        const [address] = await web3.eth.getAccounts()
        return sentTx(erc721.methods.setApprovalForAll(operator, true), { from: address })
    }
    return undefined
}
