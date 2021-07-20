import Web3 from "web3"
import { Address, BigNumber } from "@rarible/protocol-api-client"
import { createErc20Contract } from "./contracts/erc20"
import { toBn } from "../common/to-bn"
import BN from "bignumber.js"

/**
 * 1. проверить allowance.
 * 2. если не хватает, то сделать approve
 * infinite = 2^256 - 1 (max uin256)
 */
export async function approveErc20(
	web3: Web3, contract: Address, owner: Address, operator: Address, value: BigNumber | BN, infinite: Boolean = true,
): Promise<Action | undefined> {
	const erc20 = createErc20Contract(web3, contract)
	const allowance = toBn(await erc20.methods.allowance(owner, operator).call())
	if (allowance.lt(toBn(value))) { //todo нужно сделать approve
		if (infinite) {
			await erc20.methods.approve().send({})
		} else {

		}
	} else { //todo ничего не нужно, allowance хватает
		return undefined
	}
}
