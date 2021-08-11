import Ganache from "ganache-core"
import Web3 from "web3"
import Wallet from "ethereumjs-wallet"
import { randomWord, toAddress } from "@rarible/types"

export function createGanacheProvider() {

	const wallets = Array.from(Array(10).keys())
		.map(pk => new Wallet(Buffer.from(randomWord().substring(2), "hex")))

	const accounts = wallets
		.map(wallet => ({ secretKey: wallet.getPrivateKey(), balance: "0x1000000000000000000000000000" }))

	const provider = Ganache.provider({
		accounts,
		// @ts-ignore
		_chainIdRpc: 17,
	})
	// @ts-ignore
	const web3 = new Web3(provider)

	afterAll(() => {
		provider.close(() => {
		})
	})

	return {
		provider, web3, wallets, addresses: wallets.map(w => toAddress(w.getAddressString())),
	}
}
