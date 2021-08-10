import Web3 from "web3";
import {Address} from "@rarible/protocol-api-client";
import {createErc1155Contract} from "./contracts/erc1155";
import {ContractSendMethod, SendOptions} from "web3-eth-contract";

export async function approveErc1155(
    sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
    web3: Web3,
    contract: Address,
    owner: Address,
    operator: Address
): Promise<string | undefined> {
    const erc1155 = createErc1155Contract(web3, contract)
    const allowance: boolean = await erc1155.methods.isApprovedForAll(owner, operator).call()
    if (!allowance) {
        const [address] = await web3.eth.getAccounts()
        return sendTx(erc1155.methods.setApprovalForAll(operator, true), { from: address })
    }
    return undefined
}
