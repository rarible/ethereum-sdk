import Ganache from "ganache-core"
import Web3 from "web3"
import Wallet from "ethereumjs-wallet"
import { toAddress } from "@rarible/types"

export function createGanacheProviderTwoWallets() {
	const testPK = "846b79108c721af4d0ff7248f4a10c65e5a7087532b22d78645c576fadd80b7f"
	const testPK2 = "5c83b79f2d7bac78f3f6229dd0252fe1bc63d00f323e35ebb4316ce1f736c400"
	const testWallet = new Wallet(Buffer.from(testPK, "hex"))
	const testWallet2 = new Wallet(Buffer.from(testPK2, "hex"))
	const address = toAddress(testWallet.getAddressString())
	const address2 = toAddress(testWallet2.getAddressString())

	const provider = Ganache.provider({
		accounts: [
			{ secretKey: Buffer.from(testPK, "hex"), balance: "0x0001000000000000000000000000" },
			{ secretKey: Buffer.from(testPK2, "hex"), balance: "0x0001000000000000000000000000" }
		],
		// @ts-ignore
		// _chainIdRpc: 17
	})
	// @ts-ignore
	const web3 = new Web3(provider)

	afterAll(() => {
		provider.close(() => {})
	})

	return {
		web3, address: [address, address2]
	}
}
