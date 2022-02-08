import { awaitAll, createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { sentTx, getSimpleSendWithInjects } from "../common/send-transaction"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"
import { getEthereumConfig } from "../config"
import { approve as approveTemplate } from "../order/approve"
import { deployTestErc20 } from "../order/contracts/test/test-erc20"
import { createEthereumApis } from "../common/apis"
import { checkChainId } from "../order/check-chain-id"
import { StartAuction } from "./start"
import { finishAuction as finishAuctionTemplate } from "./finish"
import { PutAuctionBid } from "./put-bid"

describe("finish auction auction", () => {
	const { provider: providerSeller, wallet: walletSeller } = createE2eProvider("0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a")
	const { provider: providerBuyer, wallet: walletBuyer } = createE2eProvider("0xa0d2baba419896add0b6e638ba4e50190f331db18e3271760b12ce87fa853dcb")

	const sender1Address = walletSeller.getAddressString()
	const sender2Address = walletBuyer.getAddressString()
	const web3Seller = new Web3(providerSeller as any)
	const web3Buyer = new Web3(providerBuyer as any)

	const config = getEthereumConfig("e2e")

	const ethereum1 = new Web3Ethereum({web3: web3Seller, from: sender1Address, gas: 1000000})
	const ethereum2 = new Web3Ethereum({web3: web3Buyer, from: sender2Address, gas: 1000000})

	const checkWalletChainId1 = checkChainId.bind(null, ethereum1, config)
	const checkWalletChainId2 = checkChainId.bind(null, ethereum2, config)

	const send1 = getSimpleSendWithInjects().bind(null, checkWalletChainId1)
	const send2 = getSimpleSendWithInjects().bind(null, checkWalletChainId2)

	const approve1 = approveTemplate.bind(null, ethereum1, send1, config.transferProxies)
	const approve2 = approveTemplate.bind(null, ethereum2, send2, config.transferProxies)

	const apis = createEthereumApis("e2e")
	const auctionService = new StartAuction(ethereum1, send1, config, approve1, apis)
	const putBidService = new PutAuctionBid(ethereum2, send2, config, approve2, apis)

	const finishAuction = finishAuctionTemplate.bind(this, ethereum1, send1, config, apis)
	const it = awaitAll({
		testErc1155: deployTestErc1155(web3Seller, "TST"),
		testErc20: deployTestErc20(web3Seller, "TST", "TST"),
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
					// assetClass: "ETH",
				},
				minimalStepDecimal: toBigNumber("0.00000000000000001"),
				minimalPriceDecimal: toBigNumber("0.00000000000000005"),
				duration: 1,
				startTime: Math.floor(Date.now() / 1000) + 10,
				buyOutPriceDecimal: toBigNumber("0.00000000000000009"),
				originFees: [],
				payouts: [],
			}
		)

		await auction.tx.wait()

		const putBidTx = await putBidService.putBid({
			hash: await auction.hash,
			priceDecimal: toBigNumber("0.00000000000000005"),
			payouts: [],
			originFees: [],
		})

		await putBidTx.wait()

		const finishAuctionTx = await finishAuction(await auction.hash)
		await finishAuctionTx.wait()

		expect(await it.testErc1155.methods.balanceOf(sender2Address, "1").call()).toBe("1")

	})

})
