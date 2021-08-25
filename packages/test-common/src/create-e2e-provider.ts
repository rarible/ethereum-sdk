import Web3ProviderEngine from "web3-provider-engine"
import Wallet from "ethereumjs-wallet"
import { TestSubprovider } from "@rarible/test-provider"
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { randomWord } from "@rarible/types"

export function createE2eProvider(pk: string = randomWord()) {
	const provider = new Web3ProviderEngine()
	const wallet = new Wallet(Buffer.from(fixPK(pk), "hex"))
	provider.addProvider(new TestSubprovider(wallet, { networkId: 17, chainId: 17 }))
	provider.addProvider(new RpcSubprovider({ rpcUrl: "https://node-e2e.rarible.com" }))

	beforeAll(() => {
		provider.start()
	})

	afterAll(() => {
		provider.stop()
	})

	return {
		provider,
		wallet,
	}
}

function fixPK(pk: string) {
	if (pk.startsWith("0x")) {
		return pk.substring(2)
	} else {
		return pk
	}
}
