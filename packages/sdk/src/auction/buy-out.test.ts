import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { AuctionControllerApi, Configuration } from "@rarible/ethereum-api-client"
import { sentTx, getSimpleSendWithInjects } from "../common/send-transaction"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"
import { getEthereumConfig } from "../config"
import { approve as approveTemplate } from "../order/approve"
import { deployTestErc20 } from "../order/contracts/test/test-erc20"
import { getApiConfig } from "../config/api-config"
import { createEthereumApis } from "../common/apis"
import { createAuctionContract } from "./contracts/test/auction"
import { StartAuction } from "./start"
import { BuyoutAuction } from "./buy-out"
import { deployTestErc721ForAuction } from "./contracts/test/test-erc721"
import { getAuctionHash } from "./common"
import { awaitForAuction } from "./test"

describe("buy out auction", () => {
	const { provider: providerSeller, wallet: walletSeller } = createE2eProvider("0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a")
	const { provider: providerBuyer, wallet: walletBuyer } = createE2eProvider("0xa0d2baba419896add0b6e638ba4e50190f331db18e3271760b12ce87fa853dcb")

	const sender1Address = walletSeller.getAddressString()
	const sender2Address = walletBuyer.getAddressString()
	const web3Seller = new Web3(providerSeller as any)
	const web3Buyer = new Web3(providerBuyer as any)
	const config = getEthereumConfig("e2e")

	const configuration = new Configuration(getApiConfig("e2e"))
	const auctionApi = new AuctionControllerApi(configuration)

	const ethereum1 = new Web3Ethereum({web3: web3Seller, from: sender1Address, gas: 1000000})
	const ethereum2 = new Web3Ethereum({web3: web3Buyer, from: sender2Address, gas: 1000000})
	const approve1 = approveTemplate.bind(null, ethereum1, getSimpleSendWithInjects(), config.transferProxies)
	const approve2 = approveTemplate.bind(null, ethereum2, getSimpleSendWithInjects(), config.transferProxies)

	const apis = createEthereumApis("e2e")
	const auctionService1 = new StartAuction(ethereum1, config, approve1, apis)
	const buyoutService2 = new BuyoutAuction(ethereum2, config, approve2, auctionApi)

	const it = awaitAll({
		testErc1155: deployTestErc1155(web3Seller, "TST"),
		testErc721: deployTestErc721ForAuction(web3Seller, "TST", "TST"),
		testErc20: deployTestErc20(web3Seller, "TST", "TST"),
	})

	test("buy out erc-1155 <-> erc-20", async () => {
		await sentTx(it.testErc1155.methods.mint(sender1Address, 1, 10, "0x"), { from: sender1Address})
		await sentTx(it.testErc20.methods.mint(sender2Address, 300), { from: sender1Address })

		const auctionContract = createAuctionContract(web3Seller, config.auction)

		const auction = await auctionService1.start(
			{
				makeAssetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("1"),
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

		await auction.tx.wait()

		const auctionId = await auctionContract.methods.getAuctionByToken(it.testErc1155.options.address, "1").call()

		const hash = getAuctionHash(ethereum1, config, auctionId)
		await awaitForAuction(auctionApi, hash)

		const buyoutTx = await buyoutService2.buyout({
			auctionId,
			payouts: [],
			originFees: [],
		})

		await buyoutTx.wait()

		expect(await it.testErc1155.methods.balanceOf(sender2Address, "1").call()).toBe("1")
	})

	test("buy out erc-721 <-> erc-20", async () => {
		await sentTx(it.testErc721.methods.mint(sender1Address, 1), { from: sender1Address})
		await sentTx(it.testErc20.methods.mint(sender2Address, 300), { from: sender1Address })

		const auctionContract = createAuctionContract(web3Seller, config.auction)

		const auction = await auctionService1.start(
			{
				makeAssetType: {
					assetClass: "ERC721",
					contract: toAddress(it.testErc721.options.address),
					tokenId: toBigNumber("1"),
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

		await auction.tx.wait()

		const auctionId = await auctionContract.methods.getAuctionByToken(it.testErc721.options.address, "1").call()

		const hash = getAuctionHash(ethereum1, config, auctionId)
		await awaitForAuction(auctionApi, hash)

		const buyoutTx = await buyoutService2.buyout({
			auctionId,
			payouts: [],
			originFees: [],
		})

		await buyoutTx.wait()

		expect(await it.testErc721.methods.balanceOf(sender2Address).call()).toBe("1")
	})

	test("buy out erc-1155 <-> eth", async () => {

		await sentTx(it.testErc1155.methods.mint(sender1Address, 2, 10, "0x"), { from: sender1Address})

		const auctionContract = createAuctionContract(web3Seller, config.auction)

		const auction = await auctionService1.start({
			makeAssetType: {
				assetClass: "ERC1155",
				contract: toAddress(it.testErc1155.options.address),
				tokenId: toBigNumber("2"),
			},
			amount: toBigNumber("1"),
			takeAssetType: {
				assetClass: "ETH",
			},
			minimalStepDecimal: toBigNumber("0.000000000000000001"),
			minimalPriceDecimal: toBigNumber("0.000000000000000005"),
			duration: 1000,
			startTime: 0,
			buyOutPriceDecimal: toBigNumber("0.00000000000000001"),
			originFees: [],
			payouts: [],
		})

		await auction.tx.wait()

		const auctionId = await auctionContract.methods.getAuctionByToken(it.testErc1155.options.address, "2").call()

		const hash = getAuctionHash(ethereum1, config, auctionId)
		await awaitForAuction(auctionApi, hash)

		const buyoutTx = await buyoutService2.buyout({
			auctionId,
			payouts: [],
			originFees: [],
		})
		await buyoutTx.wait()
		expect(await it.testErc1155.methods.balanceOf(sender2Address, "2").call()).toBe("1")
	})
})
