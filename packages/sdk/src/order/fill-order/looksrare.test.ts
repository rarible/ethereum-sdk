import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress } from "@rarible/types"
import type { LooksRareOrder } from "@rarible/ethereum-api-client"
import { createRaribleSdk } from "../../index"
import { getEthereumConfig } from "../../config"
import { checkChainId } from "../check-chain-id"
import { getSimpleSendWithInjects } from "../../common/send-transaction"
import { createErc721V3Collection } from "../../common/mint"
import { MintResponseTypeEnum } from "../../nft/mint"
import { SeaportOrderHandler } from "./seaport"
import { LooksrareOrderHandler } from "./looksrare"
import { makeSellOrder } from "./looksrare-utils/create-order"

describe("seaport", () => {
	const providerConfig = {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	}
	const {provider: providerBuyer} = createE2eProvider(
		"0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a",
		providerConfig
	)
	const {provider: providerSeller} = createE2eProvider(
		"0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c",
		providerConfig
	)
	const {wallet: feeWallet} = createE2eProvider(undefined, providerConfig)
	const web3Seller = new Web3(providerSeller as any)
	const ethereumSeller = new Web3Ethereum({
		web3: web3Seller,
		gas: 3000000,
	})
	const web3 = new Web3(providerBuyer as any)
	const ethereum = new Web3Ethereum({
		web3,
		gas: 3000000,
	})

	const buyerWeb3 = new Web3Ethereum({
		web3: new Web3(providerBuyer as any),
		gas: 3000000,
	})

	const sdkBuyer = createRaribleSdk(buyerWeb3, "testnet")
	const sdkSeller = createRaribleSdk(ethereumSeller, "testnet")

	const rinkebyErc721V3ContractAddress = toAddress("0x6ede7f3c26975aad32a475e1021d8f6f39c89d82")
	const rinkebyErc1155V2ContractAddress = toAddress("0x1af7a7555263f275433c6bb0b8fdcd231f89b1d7")
	const originFeeAddress = toAddress(feeWallet.getAddressString())

	const config = getEthereumConfig("testnet")

	const checkWalletChainId = checkChainId.bind(null, ethereum, config)
	const send = getSimpleSendWithInjects().bind(null, checkWalletChainId)

	const looksrareOrderHandlerSeller = new LooksrareOrderHandler(ethereumSeller, send, config)
	const looksrareOrderHandlerBuyer = new LooksrareOrderHandler(buyerWeb3, send, config)

	test("fill", async () => {
		if (!config.exchange.looksrare) {
			throw new Error("Looksrare contract has not been set")
		}

		console.log("seller", await ethereumSeller.getFrom(), "buyer", await buyerWeb3.getFrom())
		const sellItem = await sdkSeller.nft.mint({
			collection: createErc721V3Collection(rinkebyErc721V3ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			royalties: [],
			lazy: false,
		})
		if (sellItem.type === MintResponseTypeEnum.ON_CHAIN) {
			await sellItem.transaction.wait()
		}

		const sellOrder = await makeSellOrder(
			ethereumSeller,
			sellItem.contract,
			sellItem.tokenId,
			send,
			toAddress(config.exchange.looksrare)
		)

		console.log("before fulfill")
		//
		// const tx = await looksrareOrderHandlerBuyer.fulfillOrder(sellOrder, {order: {}, amount: 1})
		// console.log("tx", tx)
		// await tx.wait()
	})

	test("fill API order", async () => {
		const order = await sdkBuyer.apis.order.getOrderByHash({
			hash: "0x634e16b1af60c0a55f9f2cc07286052613a97afde27076ce948b199241416381",
		}) as LooksRareOrder

		const tx = await sdkBuyer.order.buy({
			order,
			amount: 1,
		})
		await tx.wait()

	})
})
