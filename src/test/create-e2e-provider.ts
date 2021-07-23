import FormData from "form-data"
import Web3ProviderEngine from "web3-provider-engine"
import Wallet from "ethereumjs-wallet"
import { TestSubprovider } from "@rarible/test-provider"
import Web3 from "web3"
// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"

export function createE2eProvider() {
	(global as any).FormData = FormData

	const provider = new Web3ProviderEngine()
	const wallet = new Wallet(Buffer.from("d5012fe4e1c34f91d3d4ee8cec93af36f0100a719678d1bdaf4cf65eac833bac", "hex"))
	provider.addProvider(new TestSubprovider(wallet))
	provider.addProvider(new RpcSubprovider({ rpcUrl: "https://node-e2e.rarible.com" }))
	const web3 = new Web3(provider)

	beforeAll(() => {
		provider.start()
	})

	afterAll(() => {
		provider.stop()
	})

	return {
		web3,
		wallet,
	}
}
