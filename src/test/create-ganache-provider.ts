import Ganache from "ganache-core"
import Web3 from "web3"
import Wallet from "ethereumjs-wallet"
import { toAddress } from "@rarible/types"

export function createGanacheProvider() {
	const testPK = "846b79108c721af4d0ff7248f4a10c65e5a7087532b22d78645c576fadd80b7f"
	const testWallet = new Wallet(Buffer.from(testPK, "hex"))
	const address = toAddress(testWallet.getAddressString())

	const provider = Ganache.provider({
		accounts: [{ secretKey: Buffer.from(testPK, "hex"), balance: "0x1000000000000000000000000000" }],
	})
	// @ts-ignore
	const web3 = new Web3(provider)

	afterAll(() => {
		provider.close(() => {})
	})

	return {
		web3, address
	}
}
