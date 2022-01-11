import Web3 from "web3"
import { createRinkebyProvider } from "@rarible/ethereum-sdk-test-common"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { getEthereumConfig } from "../config"
import { rinkebyMetaTxContract } from "./metaTx"

describe("meta transaction test", () => {
	const {provider, wallet} = createRinkebyProvider()

	test("use rarible eth provider for meta transaction", async () => {
		const web3 = new Web3(provider)

		const chainConfig = getEthereumConfig("rinkeby")

		const ethereum = new Web3Ethereum({
			web3,
			metaTxProvider: chainConfig.metaTransactions?.providerOptions,
		})
		const contract = await ethereum.createContractAsync({
			abi: rinkebyMetaTxContract.abi,
			address: rinkebyMetaTxContract.address,
			name: rinkebyMetaTxContract.name,
			version: rinkebyMetaTxContract.version,
		})

		const args = {
			tokenId: wallet.getAddressString() + "000000000000000000000027",
			tokenURI: "uri:/",
			supply: 1,
			creators: [{account: wallet.getAddressString(), value: 10000}],
			royalties: [],
			signatures: ["0x"],
		}

		const tx = await contract.functionCall("mintAndTransfer", args, wallet.getAddressString()).send()
		console.log(tx)
		expect((tx as any).transactionHash).toBeTruthy()
	})
})
