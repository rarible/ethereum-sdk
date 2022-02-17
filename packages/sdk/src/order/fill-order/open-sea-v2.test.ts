import {
	 createE2eProvider,
} from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { getSimpleSendWithInjects } from "../../common/send-transaction"
import type { EthereumConfig } from "../../config/type"
import { getEthereumConfig } from "../../config"
import { createEthereumApis } from "../../common/apis"
import { checkChainId } from "../check-chain-id"
import { OrderFiller } from "./index"

export function getTestE2EEthereum(pk?: string) {
	const { provider, wallet } = createE2eProvider(pk)
	const address = wallet.getAddressString()
	const web3 = new Web3(provider as any)
	return {
		ethereum: new Web3Ethereum({ web3, from: address, gas: 1000000 }),
		web3,
		address,
	}
}
describe("fill opensea order", function () {
	const { provider, wallet } = createE2eProvider()
	const address = wallet.getAddressString()
	const web3 = new Web3(provider as any)

	const env = "rinkeby" as const
	const config: EthereumConfig = getEthereumConfig(env)
	const apis = createEthereumApis(env)
	const ethereum1 = new Web3Ethereum({ web3, from: address, gas: 1000000 })

	const checkWalletChainId1 = checkChainId.bind(null, ethereum1, config)

	const send1 = getSimpleSendWithInjects().bind(null, checkWalletChainId1)

	const filler = new OrderFiller(ethereum1, send1, config, apis, () => Promise.resolve(0))

	test.skip("opensea", async () => {

		const order: any = await apis.order.getOrderByHash({hash: "0xd518e179e3fa39b93619840265e3d0c4363fe4dc6ff73ac5a3dc71675137814d"})
		// console.log("order", order)

		order.data.target = "0x45b594792a5cdc008d0de1c1d69faa3d16b3ddc1"
		const tx = await filler.buy({
			order: order,
			amount: 1,
		})
		await tx.wait()
	})

	// Sell-side orders
})
