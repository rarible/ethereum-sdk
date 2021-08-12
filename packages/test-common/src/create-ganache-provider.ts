import Wallet from "ethereumjs-wallet"
import Ganache from "ganache-core"
import { randomWord, toAddress } from "@rarible/types"

export function createGanacheProvider(...pk: string[]) {

	let wallets: Wallet[]
	if (pk.length > 0) {
		wallets = pk.map(single => new Wallet(Buffer.from(single, "hex")))
	} else {
		wallets = Array.from(Array(10).keys())
			.map(pk => new Wallet(Buffer.from(randomWord().substring(2), "hex")))
	}
	const accounts = wallets
		.map(wallet => ({ secretKey: wallet.getPrivateKey(), balance: "0x1000000000000000000000000000" }))

	const provider = Ganache.provider({
		accounts,
		// @ts-ignore
		_chainIdRpc: 17
	})

	afterAll(() => {
		provider.close(() => {})
	})

	return {
		provider, wallets, addresses: wallets.map(w => toAddress(w.getAddressString()))
	}
}
