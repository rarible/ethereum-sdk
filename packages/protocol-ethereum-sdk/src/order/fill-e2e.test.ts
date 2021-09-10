import { Order } from "@rarible/protocol-api-client"
import fetch from "node-fetch"
import { toAddress, toBigNumber } from "@rarible/types"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { createRaribleSdk } from "../index"
import { retry } from "../common/retry"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"

describe("erc721 create bid/accept bid", function () {
	const { provider: provider1, wallet: wallet1 } = createE2eProvider()
	const { provider: provider2 } = createE2eProvider()
	const web31 = new Web3(provider1)
	const web32 = new Web3(provider2)
	const sdk1 = createRaribleSdk(new Web3Ethereum({ web3: web31 }), "e2e", { fetchApi: fetch })
	const sdk2 = createRaribleSdk(new Web3Ethereum({ web3: web32 }), "e2e", { fetchApi: fetch })

	const conf = awaitAll({
		testErc20: deployTestErc20(web31, "TST", "TST"),
		testErc721: deployTestErc721(web31, "test", "test"),
	})

	test("test create/accept bid of erc721", async () => {
		await conf.testErc20.methods.mint(wallet1.getAddressString(), 100)
		await conf.testErc721.methods.mint(wallet1.getAddressString(), "1", "uri")
		const order: Order = await sdk1.order.bid({
			makeAssetType: {
				assetClass: "ERC20",
				contract: toAddress(conf.testErc20.options.address),
			},
			takeAssetType: {
				assetClass: "ERC721",
				contract: toAddress(conf.testErc721.options.address),
				tokenId: toBigNumber("1"),
			},
			amount: 1,
			maker: toAddress(wallet1.getAddressString()),
			originFees: [],
			payouts: [],
			price: "10",
		}).then(a => a.build().runAll())
		debugger
		await sdk2.order.fill(order, {
			payouts: [],
			originFees: [],
			amount: 1,
			infinite: true,
		}).then(a => {
			debugger
			let result
			try {
				const stages = a.build()
				stages.run(0).then(e => {
					console.log("run 0 resolved", e)
					stages.run(1).then(e => {
						console.log("stage 1 resolved", e)
					})
				})
				const ids = stages.ids
				console.log(ids)
				debugger
				// const run0 = await stages.runAll()
				// console.log("run0", run0)
				debugger
				console.log("stages.result", result)
				return stages.result
			} catch (e) {
				console.log("e", e)
				result = "error"
			}
			debugger
			return result
		})
		debugger
		debugger
		await retry(10, async () => {
			const a = await sdk2.apis.orderActivity.getOrderActivities({
				orderActivityFilter: {
					"@type": "by_item",
					contract: toAddress(conf.testErc721.options.address),
					tokenId: toBigNumber("1"),
					types: ["MATCH", "LIST", "BID"],
				},
			})
			expect(a.items.filter(a => a["@type"] === "bid")).toHaveLength(1)
			expect(a.items.filter(a => a["@type"] === "match")).toHaveLength(1)
		})
	}, 50000)
})
