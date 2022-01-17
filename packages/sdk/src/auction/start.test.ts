import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { sentTx, simpleSend } from "../common/send-transaction"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"
import { getEthereumConfig } from "../config"
import { approve as approveTemplate } from "../order/approve"
import { deployTestErc20 } from "../order/contracts/test/test-erc20"
import { deployTestErc721 } from "../order/contracts/test/test-erc721"
import { startAuction } from "./start"

describe("start auction", () => {
	const { provider, wallet } = createE2eProvider("0xa0d2baba419896add0b6e638ba4e50190f331db18e3271760b12ce87fa853dcb")

	const sender1Address = wallet.getAddressString()
	const web3 = new Web3(provider as any)
	const config = getEthereumConfig("e2e")

	const ethereum1 = new Web3Ethereum({web3, from: sender1Address, gas: 1000000})

	const it = awaitAll({
		testErc721: deployTestErc721(web3, "TST", "TST"),
		testErc1155: deployTestErc1155(web3, "TST"),
		testErc20: deployTestErc20(web3, "TST", "TST"),
	})

	test("start erc-721 <-> eth auction", async () => {
		const approve1 = approveTemplate.bind(null, ethereum1, simpleSend, config.transferProxies)

		await sentTx(it.testErc721.methods.mint(sender1Address, 1, "0x"), { from: sender1Address })

		const auction = await startAuction(
			ethereum1,
			config,
			approve1,
			{
				makeAssetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber("1"),
				},
				amount: toBigNumber("1"),
				takeAssetType: {
					assetClass: "ETH",
				},
				minimalStepDecimal: toBigNumber("0.00000000000000001"),
				minimalPriceDecimal: toBigNumber("0.00000000000000005"),
				duration: 1000,
				startTime: 0,
				buyOutPriceDecimal: toBigNumber("0.0000000000000001"),
				originFees: [],
				payouts: [],
			}
		)

		await auction.wait()
	})

	test("start erc-1155 <-> eth auction", async () => {
		const approve1 = approveTemplate.bind(null, ethereum1, simpleSend, config.transferProxies)

		await sentTx(it.testErc1155.methods.mint(sender1Address, 1, 10, "0x"), { from: sender1Address })

		const auction = await startAuction(
			ethereum1,
			config,
			approve1,
			{
				makeAssetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("1"),
				},
				amount: toBigNumber("1"),
				takeAssetType: {
					assetClass: "ETH",
				},
				minimalStepDecimal: toBigNumber("0.00000000000000001"),
				minimalPriceDecimal: toBigNumber("0.00000000000000005"),
				duration: 1000,
				startTime: 0,
				buyOutPriceDecimal: toBigNumber("0.0000000000000001"),
				originFees: [],
				payouts: [],
			}
		)

		await auction.wait()
	})

	test("start erc-1155 <-> erc20 auction", async () => {
		const approve1 = approveTemplate.bind(null, ethereum1, simpleSend, config.transferProxies)

		await sentTx(it.testErc1155.methods.mint(sender1Address, 2, 10, "0x"), { from: sender1Address })

		const auction = await startAuction(
			ethereum1,
			config,
			approve1,
			{
				makeAssetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("2"),
				},
				amount: toBigNumber("1"),
				takeAssetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				minimalStepDecimal: toBigNumber("0.00000000000000001"),
				minimalPriceDecimal: toBigNumber("0.00000000000000005"),
				duration: 1000,
				startTime: 0,
				buyOutPriceDecimal: toBigNumber("0.0000000000000001"),
				originFees: [],
				payouts: [],
			}
		)

		await auction.wait()
	})
})
