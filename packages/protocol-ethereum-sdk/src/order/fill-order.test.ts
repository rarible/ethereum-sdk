import { BN } from "ethereumjs-util"
import { randomWord, toAddress, toBigNumber, toBinary } from "@rarible/types"
import { ethers } from "ethers"
import { sentTx } from "../common/send-transaction"
import { createGanacheProvider } from "../test/create-ganache-provider"
import { toBn } from "../common/to-bn"
import { awaitAll } from "../common/await-all"
import { EthersEthereum } from "../../../ethers-ethereum"
import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTestErc721 } from "./contracts/test/test-erc721"
import { deployTransferProxy } from "./contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "./contracts/test/test-erc20-transfer-proxy"
import { deployTestExchangeV2 } from "./contracts/test/test-exchange-v2"
import { deployTestRoyaltiesProvider } from "./contracts/test/test-royalties-provider"
import { fillOrder, fillOrderSendTx } from "./fill-order"
import { signOrder, SimpleOrder } from "./sign-order"
import { deployTestErc1155 } from "./contracts/test/test-erc1155"

describe("fillOrder", () => {
	const { web3, addresses, provider } = createGanacheProvider()
	//@ts-ignore
	const pr = new ethers.providers.Web3Provider(provider)
	const ethereum = new EthersEthereum(pr.getSigner())
	const [sender1Address, sender2Address] = addresses

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "Test1", "TST1"),
		testErc721: deployTestErc721(web3, "Test", "TST"),
		testErc1155: deployTestErc1155(web3, "Test"),
		transferProxy: deployTransferProxy(web3),
		erc20TransferProxy: deployErc20TransferProxy(web3),
		royaltiesProvider: deployTestRoyaltiesProvider(web3),
		exchangeV2: deployTestExchangeV2(web3),
	})

	beforeAll(async () => {
		/**
		 * Configuring
		 */
		await sentTx(it.exchangeV2.methods.__ExchangeV2_init(
			toAddress(it.transferProxy.options.address),
			toAddress(it.erc20TransferProxy.options.address),
			toBigNumber('0'),
			sender1Address,
			toAddress(it.royaltiesProvider.options.address),
		), { from: sender1Address })
		await sentTx(it.transferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), { from: sender1Address })
		await sentTx(it.erc20TransferProxy.methods.addOperator(toAddress(it.exchangeV2.options.address)), { from: sender1Address })
	})

	test('should match order(buy erc1155 for erc20)', async () => {
		//sender1 has ERC20, sender2 has ERC1155

		await sentTx(it.testErc20.methods.mint(sender1Address, 100), { from: sender1Address })
		await sentTx(it.testErc1155.methods.mint(sender2Address, 1, 10, "0x"), { from: sender1Address })

		const left: SimpleOrder = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(it.testErc1155.options.address),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("5"),
			},
			maker: sender2Address,
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(it.testErc20.options.address),
				},
				value: toBigNumber("10"),
			},
			salt: toBinary(randomWord()),
			type: 'RARIBLE_V2',
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
		}

		//todo approve using our functions
		await sentTx(
			it.testErc20.methods.approve(
				it.erc20TransferProxy.options.address,
				new BN(10),
			),
			{ from: sender1Address },
		)

		await sentTx(
			it.testErc1155.methods.setApprovalForAll(it.transferProxy.options.address, true),
			{ from: sender2Address },
		)

		const a = toAddress(it.exchangeV2.options.address)
		const signature = await signOrder(web3, { chainId: 1, exchange: { v1: a, v2: a } }, left)

		const hash = await fillOrderSendTx(
			ethereum,
			{ v2: toAddress(it.exchangeV2.options.address), v1: toAddress(it.exchangeV2.options.address) },
			{ ...left, signature },
			{ amount: 2, payouts: [], originFees: [] },
		)
		await web3.eth.getTransactionReceipt(hash as string)

		expect(toBn(await it.testErc20.methods.balanceOf(sender2Address).call()).toString())
			.toBe("4")
		expect(toBn(await it.testErc1155.methods.balanceOf(sender1Address, 1).call()).toString())
			.toBe("2")
	})
})
