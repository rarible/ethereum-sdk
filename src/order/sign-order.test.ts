import Web3 from "web3"
import { signOrder } from "./sign-order"
import Wallet from "ethereumjs-wallet"
import { toAddress } from "@rarible/types/build/address"
import { toBigNumber } from "@rarible/types/build/big-number"
import { OrderForm } from "@rarible/protocol-api-client"
import Web3ProviderEngine from "web3-provider-engine"
// @ts-ignore
import RpcSubprovider from "web3-provider-engine/subproviders/rpc"
import { TestSubprovider } from "@rarible/test-provider"

const provider = new Web3ProviderEngine()
const wallet = new Wallet(Buffer.from("d5012fe4e1c34f91d3d4ee8cec93af36f0100a719678d1bdaf4cf65eac833bac", "hex"))
provider.addProvider(new TestSubprovider(wallet))
provider.addProvider(new RpcSubprovider({ rpcUrl: "https://node-e2e.rarible.com" }))
const web3 = new Web3(provider)

describe("signOrder", () => {

	test("should sign legacy orders", async () => {
		await web3.eth.getChainId()
		const signature = await signOrder(
			web3,
			wallet.getAddressString(),
			{
				...TEST_ORDER_TEMPLATE,
				type: "RARIBLE_V1",
				data: {
					dataType: "LEGACY",
					fee: 100,
				},
			},
		)
		expect(signature).toEqual("0x8ff2ec0cb773bcc98ad2331b29a19dd0ae956703b07993f37da4bf44eea8ca30429e6eae174a999d6a6030885ec8e1b44f691c8f4138a7076d1ddcc7e92347591c")
	})

	test("should sign v2 orders", async () => {
		const signature = await signOrder(
			web3,
			wallet.getAddressString(),
			{
				...TEST_ORDER_TEMPLATE,
				type: "RARIBLE_V2",
				data: {
					dataType: "RARIBLE_V2_DATA_V1",
					payouts: [],
					originFees: [],
				},
			},
		)
		expect(signature).toEqual("0xe7febac2754d2d452f8e4ff6e4aca80ee80d2b4a7185903ae38b0a2ff8b4bb741ab25668e1291cd407ea31cd8e44c3a7ea0baec08dadbe1215dcf9a58cddd7531b")
	})

	beforeAll(() => {
		provider.start()
	})

	afterAll(() => {
		provider.stop()
	})
})

const TEST_ORDER_TEMPLATE: Omit<OrderForm, "type" | "data"> = {
	make: {
		assetType: {
			assetClass: "ERC721",
			contract: toAddress("0x0000000000000000000000000000000000000001"),
			tokenId: toBigNumber("10"),
		},
		value: toBigNumber("10"),
	},
	maker: toAddress("0x0000000000000000000000000000000000000002"),
	take: {
		assetType: {
			assetClass: "ERC721",
			contract: toAddress("0x0000000000000000000000000000000000000001"),
			tokenId: toBigNumber("10"),
		},
		value: toBigNumber("10"),
	},
	salt: toBigNumber("10"),
}
