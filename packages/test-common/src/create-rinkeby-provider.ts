import Web3ProviderEngine from "web3-provider-engine"
import Wallet from "ethereumjs-wallet"
import { TestSubprovider } from "@rarible/test-provider"
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { randomWord } from "@rarible/types"

export function createRinkebyWallet(pk: string = randomWord()): Wallet {
	return new Wallet(Buffer.from(fixPK(pk), "hex"))
}

export function createRinkebyProvider(pk: string = randomWord()) {
	const provider = new Web3ProviderEngine({ pollingInterval: 100 })
	const wallet = createRinkebyWallet(pk)
	provider.addProvider(new TestSubprovider(wallet, { networkId: 4, chainId: 4 }))
	provider.addProvider(new RpcSubprovider({ rpcUrl: "https://node-rinkeby.rarible.com/" }))

	beforeAll(() => provider.start())
	afterAll(() => provider.stop())

	return {
		provider,
		wallet,
	}
}

function fixPK(pk: string) {
	return pk.startsWith("0x") ? pk.substring(2) : pk
}
