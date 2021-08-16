import { Address, BigNumber } from "@rarible/protocol-api-client"
import BN from "bignumber.js"
import { Ethereum } from "@rarible/ethereum-provider"
import { toBn } from "../common/to-bn"
import { createErc20Contract } from "./contracts/erc20"

const infiniteBn = toBn(2).pow(256).minus(1)

export async function approveErc20(
	ethereum: Ethereum,
	contract: Address,
	owner: Address,
	operator: Address,
	value: BigNumber | BN,
	infinite: boolean = true,
): Promise<string | undefined> {
	const erc20 = createErc20Contract(ethereum, contract)
	const allowance = toBn(await erc20.functionCall("allowance", owner, operator).call())
	const bnValue = toBn(value)
	if (allowance.lt(bnValue)) {
		if (!infinite) {
			const tx = await erc20.functionCall("approve", operator, bnValue.toFixed()).send()
			return tx.hash
		} else {
			const tx = await erc20.functionCall("approve", operator, infiniteBn.toFixed()).send()
			return tx.hash
		}
	} else {
		return undefined
	}
}

