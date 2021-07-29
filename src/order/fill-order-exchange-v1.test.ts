import { deployTestErc20 } from "./contracts/test/test-erc20"
import { deployTransferProxy } from "./contracts/test/test-transfer-proxy"
import { deployErc20TransferProxy } from "./contracts/test/test-erc20-transfer-proxy"
import { Contract } from "web3-eth-contract"
import {Address, BigNumber, randomWord, toAddress, toBigNumber, toBinary, ZERO_ADDRESS} from "@rarible/types"
import { sentTx } from "../common/send-transaction"
import { BN } from "ethereumjs-util"
import { fillOrder, fillOrderSendTx } from "./fill-order"
import { signOrder, SimpleOrder } from "./sign-order"
import { createGanacheProvider } from "../test/create-ganache-provider"
import {deployTestErc1155} from "./contracts/test/test-erc1155";
import {createStateExchangeV1Contract} from "./contracts/state-exchange-v1";
import {createTransferProxyForDeprecatedContract} from "./contracts/test/test-transfer-proxy-for-deprecated";
import {deployTestExchangeV1} from "./contracts/test/test-exchange-v1";
import {toBn} from "../common/to-bn";
import {Order} from "@rarible/protocol-api-client";

describe("fillOrder exchange v1", () => {
	const { web3, addresses } = createGanacheProvider()
	const [sender1Address, sender2Address] = addresses

	let testErc20: Contract
	let transferProxy: Contract
	let erc20TransferProxy: Contract
	let exchangeV1: Contract
	let state: Contract
	let proxyForDeprecated: Contract
	let testErc1155: Contract

	beforeAll(async () => {
		/**
		 * Deploy
		 */
		let beneficiary: Address //todo
		let buyerFeeSigner: Address //todo
		testErc1155 = await deployTestErc1155(web3, "TST")
		testErc20 = await deployTestErc20(web3, "Test1", "TST1")
		state = await createStateExchangeV1Contract(web3)
		transferProxy = await deployTransferProxy(web3)
		proxyForDeprecated = createTransferProxyForDeprecatedContract(web3)
		erc20TransferProxy = await deployErc20TransferProxy(web3)
		exchangeV1 = await deployTestExchangeV1(
			web3,
			toAddress(transferProxy.options.address),
			toAddress(proxyForDeprecated.options.address),
			toAddress(testErc20.options.address),
			toAddress(state.options.address),
			ZERO_ADDRESS,
			beneficiary,
			buyerFeeSigner)
		/**
		 * Configuring
		 */
		let saleAddress: Address
		let buyer: Address
		await sentTx(state.methods.addOperator(saleAddress),{from: sender1Address})
		await sentTx(transferProxy.methods.addOperator(saleAddress), {from: sender1Address})
		await sentTx(proxyForDeprecated.methods.addOperator(saleAddress), {from: sender1Address})
		await sentTx(erc20TransferProxy.methods.addOperator(saleAddress), {from: sender1Address})
		await sentTx(testErc1155.methods.setApprovalForAll(toAddress(transferProxy.options.address), true), {from: sender1Address})
		await sentTx(testErc20.methods.approve(toAddress(erc20TransferProxy.options.address), toBn(10).pow(30)), {from: buyer})
	})

	test('exchangeV1', async () => {
		//sender1 has ERC20, sender2 has ERC721
		const tokenId = sender1Address + "b00000000000000000000003"
		await sentTx(testErc1155.methods.mint(sender1Address, tokenId, toBn(1), '1'),{from: sender1Address})
		await sentTx(testErc20.methods.mint(sender1Address, 20), { from: sender1Address })
		const orderLeft: Order = {
			maker: sender1Address,
			taker: null,
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(testErc20.options.address)
				},
				value: toBigNumber('1')
			},
			take: {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(testErc1155.options.address),
					tokenId: toBigNumber(tokenId)
				},
				value: toBigNumber('1')
			},
			makeStock: toBigNumber('10'),
			type: 'RARIBLE_V1',
			fill: toBigNumber('0'),
			cancelled: false,
			salt: toBinary('testSalt'),
			start: null,
			end: null,
			data: {
				dataType: "LEGACY",
				fee: 0//todo
			},
			signature: null,
			createdAt: `${new Date().valueOf()}`,
			lastUpdateAt: `${new Date().valueOf()}`
		}
	})
})
