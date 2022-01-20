import { awaitAll } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common/build/create-ganache-provider"
import { sentTx, getSimpleSendWithInjects } from "../common/send-transaction"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"
import { getEthereumConfig } from "../config"
import { approve as approveTemplate } from "../order/approve"
import { deployTestErc20 } from "../order/contracts/test/test-erc20"
import { deployTransferProxy } from "../order/contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "../order/contracts/test/test-erc20-transfer-proxy"
import { deployTestRoyaltiesProvider } from "../order/contracts/test/test-royalties-provider"
import { createAuctionContract, deployAuctionContract } from "./contracts/test/auction"
import { StartAuction } from "./start"
import { finishAuction } from "./finish"
import { increaseTime, testPutBid } from "./test"

describe("finish auction auction", () => {
	const { provider, addresses } = createGanacheProvider()
	const [sender1Address, sender2Address] = addresses

	const web3 = new Web3(provider as any)
	const config = getEthereumConfig("e2e")

	const ethereum1 = new Web3Ethereum({web3, from: sender1Address, gas: 1000000})
	const ethereum2 = new Web3Ethereum({web3, from: sender2Address, gas: 1000000})

	const approve1 = approveTemplate.bind(null, ethereum1, getSimpleSendWithInjects(), config.transferProxies)
	const approve2 = approveTemplate.bind(null, ethereum2, getSimpleSendWithInjects(), config.transferProxies)

	const auctionService = new StartAuction(ethereum1, config, approve1)

	const it = awaitAll({
		testErc1155: deployTestErc1155(web3, "TST"),
		testErc20: deployTestErc20(web3, "TST", "TST"),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		auction: deployAuctionContract(web3),
	})

	beforeAll(async () => {
		await sentTx(
			it.auction.methods.__AuctionHouse_init(
				it.transferProxy.options.address,
				it.erc20TransferProxy.options.address,
				300,
				sender1Address,
				it.royaltiesProvider.options.address,
			),
			{ from: sender1Address, gasPrice: "0", gas: 100000000 }
		)

		await sentTx(
			it.transferProxy.methods.addOperator(it.auction.options.address),
			{ from: sender1Address, gas: 10000000 }
		)
		await sentTx(
			it.erc20TransferProxy.methods.addOperator(it.auction.options.address),
			{ from: sender1Address, gas: 10000000 }
		)

		config.transferProxies.nft = toAddress(it.transferProxy.options.address)
		config.transferProxies.erc20 = toAddress(it.erc20TransferProxy.options.address)
		config.auction = toAddress(it.auction.options.address)
		await sentTx(it.auction.methods.setProtocolFee(2000), { from: sender1Address })
	})

	test("finish auction erc-1155 <-> erc-20", async () => {
		await sentTx(it.testErc1155.methods.mint(sender1Address, 1, 10, "0x"), { from: sender1Address, gas: 1000000 })
		await sentTx(it.testErc20.methods.mint(sender2Address, 300000), { from: sender1Address, gas: 1000000 })

		const auction = await auctionService.start(
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
				duration: 900,
				startTime: 0,
				buyOutPriceDecimal: toBigNumber("0.0000000000000001"),
				originFees: [],
				payouts: [],
			}
		)

		await auction.wait()
		const auctionContract = createAuctionContract(web3, config.auction)

		const auctionId = await auctionContract.methods.getAuctionByToken(it.testErc1155.options.address, "1").call()

		const putBidTx = await testPutBid(
			ethereum2,
			config,
			approve2,
			{
				assetClass: "ERC20",
				contract: toAddress(it.testErc20.options.address),
			},
			{
				auctionId,
				priceDecimal: toBigNumber("0.00000000000000005"),
				payouts: [],
				originFees: [],
			}
		)

		await putBidTx.wait()

		await increaseTime(web3, 901)

		const finishAuctionTx = await finishAuction(
			ethereum1,
			config,
			auctionId
		)
		await finishAuctionTx.wait()

		expect(await it.testErc1155.methods.balanceOf(sender2Address, "1").call()).toBe("1")

	})

})
