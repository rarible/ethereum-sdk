import Web3 from "web3";
import {Address} from "@rarible/protocol-api-client";
import {Contract, ContractSendMethod, SendOptions} from "web3-eth-contract";
import {createErc1155Contract} from "../order/contracts/erc1155";

export async function transferErc1155(
    sentTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
    web3: Web3,
    contract: Address,
    from: Address,
    to: Address,
    tokenId: string | string[],
    tokenAmount: string | string[]
): Promise<string | undefined> {
    let erc1155: Contract
    const [address] = await web3.eth.getAccounts()
    if (Array.isArray(tokenId) && Array.isArray((tokenAmount))) {
        if (tokenId.length === tokenAmount.length) {
            erc1155 = createErc1155Contract(web3, contract)
            return await sentTx(erc1155.methods.safeBatchTransferFrom(from, to, tokenId, tokenAmount, '0x0'), {from: address})
        } else {
            return undefined
        }
    } else if (typeof tokenId === "string" && typeof tokenAmount === "string") {
        erc1155 = createErc1155Contract(web3, contract)
        return await sentTx(erc1155.methods.safeTransferFrom(from, to, tokenId, tokenAmount, '0x0'), {from: address})
    } else {
        return undefined
    }
}
