import { toAddress, toBigNumber } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import fetch from "node-fetch"
import { sentTx } from "../common/send-transaction"
import { toBn } from "../common/to-bn"
import { awaitAll } from "../common/await-all"
import { createRaribleSdk } from "../index"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc1155 } from "./contracts/test/test-erc1155"

describe("fillOrder", () => {
	const {
		wallet: wallet1,
		provider: provider1,
	} = createE2eProvider("d77f04ffd874d3f59016ed152a6a2385a0fe9c47ab5034256bb4f81559b1b534")
	const {
		wallet: wallet2,
		provider: provider2,
	} = createE2eProvider("ded057615d97f0f1c751ea2795bc4b03bbf44844c13ab4f5e6fd976506c276b9")
	const [sender1Address, sender2Address] = [wallet1.getAddressString(), wallet2.getAddressString()]
	//@ts-ignore
	const web31 = new Web3(provider1)
	const web32 = new Web3(provider2)
	const sdk1 = createRaribleSdk(new Web3Ethereum({ web3: web31 }), "e2e", { fetchApi: fetch })
	const sdk2 = createRaribleSdk(new Web3Ethereum({ web3: web32 }), "e2e", { fetchApi: fetch })
	const it = awaitAll({
		testErc20: deployTestErc20(web31, "Test1", "TST1"),
		testErc1155: deployTestErc1155(web31, "Test"),
	})

	test('should match order(buy erc1155 for ETH)', async () => {

		await sentTx(it.testErc1155.methods.mint(sender1Address, 1, 100, "0x"), { from: sender1Address })
		const order = await sdk1.order.sell({
			makeAssetType: {
				assetClass: "ERC1155",
				contract: toAddress(it.testErc1155.options.address),
				tokenId: toBigNumber("1"),
			},
			amount: 50,
			maker: toAddress(wallet1.getAddressString()),
			originFees: [],
			payouts: [],
			price: 10,
			takeAssetType: { assetClass: "ETH" },
		}).then(a => a.runAll())
		await sdk2.order.fill(order, {
			payouts: [],
			originFees: [],
			amount: 10,
			infinite: true,
		}).then(a => a.runAll())

		expect(toBn(await it.testErc1155.methods.balanceOf(sender2Address, 1).call()).toString())
			.toBe("10")
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call()).toString())
			.toBe("90")
	}, 20000)
})

