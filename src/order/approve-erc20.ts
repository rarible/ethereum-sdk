import Web3 from "web3"
import { Address, BigNumber } from "@rarible/protocol-api-client"
import { createErc20Contract } from "./contracts/erc20"
import { toBn } from "../common/to-bn"
import BN from "bignumber.js"
import type {ContractSendMethod, SendOptions} from "web3-eth-contract";

const infiniteBn = toBn(2).pow(256).minus(1)

export async function approveErc20(
	sendTx: (source: ContractSendMethod, options: SendOptions) => Promise<string>,
	web3: Web3,
	contract: Address,
	owner: Address,
	operator: Address,
	value: BigNumber | BN,
	infinite: boolean = true,
): Promise<string | undefined> {
	const erc20 = createErc20Contract(web3, contract)
	const allowance = toBn(await erc20.methods.allowance(owner, operator).call())
	const bnValue = toBn(value)
	if (allowance.lt(bnValue)) {
		const [address] = await web3.eth.getAccounts()
		if (!infinite) {
			return sendTx(erc20.methods.approve(operator, bnValue), { from: address })
		} else {
			return sendTx(erc20.methods.approve(operator, infiniteBn), { from: address })
		}
	} else {
		return undefined
	}
}
