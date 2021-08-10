import { Address, BigNumber } from "@rarible/protocol-api-client"
import { createErc20Contract } from "./contracts/erc20"
import { toBn } from "../common/to-bn"
import BN from "bignumber.js"
import { Ethereum } from "@rarible/ethereum-provider"

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
	const allowance = toBn(await erc20.call("allowance", owner, operator))
	const bnValue = toBn(value)
	if (allowance.lt(bnValue)) {
		if (!infinite) {
			const tx = await erc20.send("approve", operator, bnValue.toFixed())
			return tx.hash
		} else {
			const tx = await erc20.send("approve", operator, infiniteBn.toFixed())
			return tx.hash
		}
	} else {
		return undefined
	}
}

