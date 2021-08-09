import Web3 from "web3"
import { Address, BigNumber } from "@rarible/protocol-api-client"
import { createErc20Contract } from "./contracts/erc20"
import { toBn } from "../common/to-bn"
import BN from "bignumber.js"
import { Contract } from "web3-eth-contract"
import { PromiEvent } from "web3-core"
import { ContractFactory, ethers, Signer, Contract as EthContract } from "ethers"

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

export interface Ethereum {
	createContract(abi: any, address?: string): EthereumContract
}

export interface EthereumContract {
	call(name: string, ...args: any): Promise<any>
	send(name: string, ...args: any): Promise<EthereumTransaction>
}

export interface EthereumTransaction {
	hash: string
	wait(): Promise<void>
}

export class Web3Ethereum implements Ethereum {
	constructor(private readonly web3: Web3) {

	}

	createContract(abi: any, address?: string): EthereumContract {
		return new Web3Contract(this.web3, new this.web3.eth.Contract(abi, address))
	}
}

export class Web3Contract implements EthereumContract {
	constructor(private readonly web3: Web3, private readonly contract: Contract) {
	}

	call(name: string, ...args: any): Promise<any> {
		return this.contract.methods[name](...args).call()
	}

	async send(name: string, ...args: any): Promise<EthereumTransaction> {
		const [address] = await this.web3.eth.getAccounts()
		const promiEvent: PromiEvent<any> = this.contract.methods[name](...args).send({ from: address })
		const hash = await new Promise<string>(((resolve, reject) => {
			promiEvent.on("transactionHash", resolve)
			promiEvent.on("error", reject)
		}))
		return new Web3Transaction(hash, promiEvent)
	}
}

export class Web3Transaction implements EthereumTransaction {
	constructor(readonly hash: string, private readonly promiEvent: PromiEvent<any>) {
	}

	wait(): Promise<void> {
		return new Promise(((resolve, reject) => {
			this.promiEvent.on("receipt", r => resolve())
			this.promiEvent.on("error", reject)
		}));
	}
}

