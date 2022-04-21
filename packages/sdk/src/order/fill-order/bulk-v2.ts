import type { Address } from "@rarible/ethereum-api-client"
import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import { hashToSign, orderToStruct } from "../sign-order"
import type { EthereumConfig } from "../../config/type"
import type { SendFunction } from "../../common/send-transaction"
import type { SimpleRaribleV2Order } from "../types"
import { isSigner } from "../../common/is-signer"
import type { SimpleOrder } from "../types"
import type { RaribleEthereumApis } from "../../common/apis"
import { createExchangeBulkV2Contract } from "../contracts/exchange-bulk-v2"
import { createOpenseaContract } from "../contracts/exchange-opensea-v1"
import { toVrs } from "../../common/to-vrs"
import type { OrderFillSendData } from "./types"
import type { BulkFillRequest } from "./types"
import {
	getAtomicMatchArgAddresses, getAtomicMatchArgAddressesForBulkV2,
	getAtomicMatchArgCommonData,
	getAtomicMatchArgUints,
	getBuySellOrders, getMatchOpenseaOptions,
	OpenSeaOrderHandler,
} from "./open-sea"
import { RaribleV2OrderHandler } from "./rarible-v2"
import { convertOpenSeaOrderToDTO } from "./open-sea-converter"

export class BulkV2OHandler {
	v2Handler: RaribleV2OrderHandler
	openSeaHandler: OpenSeaOrderHandler
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly send: SendFunction,
		private readonly config: EthereumConfig,
		private readonly apis: RaribleEthereumApis,
		private readonly getBaseOrderFeeConfig: (type: SimpleOrder["type"]) => Promise<number>,
	) {
		this.v2Handler = new RaribleV2OrderHandler(ethereum, send, config, getBaseOrderFeeConfig)
		this.openSeaHandler = new OpenSeaOrderHandler(ethereum, send, config, apis, getBaseOrderFeeConfig)
	}


	async getTransactionData(
		request: BulkFillRequest[]
	): Promise<OrderFillSendData> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		let options = {}
		const tradeData: {
			marketWyvern: boolean, amount: string, tradeData: string
		}[] = await Promise.all(request.map(async o => {
			const {order, infinite} = o
			if (order.take.assetType.assetClass !== "ETH") {
				throw new Error("Bulk purchase only available for ETH currency")
			}
			switch (order.type) {
				case "RARIBLE_V2": {
					return {
						marketWyvern: false,
						amount: order.take.value.toString(),
						tradeData: "",
					}
				}
				case "OPEN_SEA_V1": {
					if (!this.ethereum) {
						throw new Error("Wallet undefined")
					}
					const from = toAddress(await this.ethereum.getFrom())
					const inverted = await this.openSeaHandler.invert({ order }, from)
					const { buy, sell } = getBuySellOrders(order, inverted)
					const sellOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, sell)
					const buyOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, buy)

					const exchangeContract = createOpenseaContract(this.ethereum, order.data.exchange)

					const buyVRS = toVrs(buy.signature || "")
					const sellVRS = toVrs(sell.signature || "")
					const ordersCanMatch = await exchangeContract
						.functionCall(
							"ordersCanMatch_",
							[...getAtomicMatchArgAddresses(buyOrderToSignDTO), ...getAtomicMatchArgAddresses(sellOrderToSignDTO)],
							[...getAtomicMatchArgUints(buyOrderToSignDTO), ...getAtomicMatchArgUints(sellOrderToSignDTO)],
							[...getAtomicMatchArgCommonData(buyOrderToSignDTO), ...getAtomicMatchArgCommonData(sellOrderToSignDTO)],
							buyOrderToSignDTO.calldata,
							sellOrderToSignDTO.calldata,
							buyOrderToSignDTO.replacementPattern,
							sellOrderToSignDTO.replacementPattern,
							buyOrderToSignDTO.staticExtradata,
							sellOrderToSignDTO.staticExtradata
						)
						.call()
					if (!ordersCanMatch) {
						throw new Error("Orders cannot be matched")
					}
					if (order.make.assetType.assetClass !== "ERC721") { //todo remove temporary condition
						throw new Error("Unsupported todo")
					}
					const encodedInitial = await this.openSeaHandler.encodeOrder(order)
					const encodedInverted = await this.openSeaHandler.encodeOrder(inverted)
					const merklePart = "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000"
					const methodSigPart = "0x23b872dd"//"0xfb16a595"
					const zeroWord = "0000000000000000000000000000000000000000000000000000000000000000"
					console.log("TOKEN ID: ", order.make.assetType.tokenId)
					const callDataBuy = methodSigPart + zeroWord + addrToBytes32No0x(from) +
						addrToBytes32No0x(order.make.assetType.contract) + order.make.assetType.tokenId + merklePart
					const callDataSell = methodSigPart + addrToBytes32No0x(order.maker) + zeroWord +
						addrToBytes32No0x(order.make.assetType.contract) + order.make.assetType.tokenId + merklePart
					console.log("encodedInverted.callData + merklePart", encodedInverted.callData + merklePart)
					console.log("encodedInitial.callData + merklePart", encodedInitial.callData + merklePart)
					console.log("this.config.exchange.bulkV2", this.config.exchange.bulkV2)
					const functionCall = exchangeContract.functionCall(
						"atomicMatch_",
						[
							...getAtomicMatchArgAddressesForBulkV2(buyOrderToSignDTO, this.config.exchange.bulkV2),
							...getAtomicMatchArgAddressesForBulkV2(sellOrderToSignDTO, this.config.exchange.bulkV2),
						],
						[...getAtomicMatchArgUints(buyOrderToSignDTO), ...getAtomicMatchArgUints(sellOrderToSignDTO)],
						// [
						// 	1, 0, 0, 1,
						// 	1, 1, 0, 1
						// ],
						[...getAtomicMatchArgCommonData(buyOrderToSignDTO), ...getAtomicMatchArgCommonData(sellOrderToSignDTO)],
						// callDataBuy,
						// callDataSell,
						// encodedInverted.callData + merklePart,
						// encodedInitial.callData + merklePart,
						buyOrderToSignDTO.calldata,
						sellOrderToSignDTO.calldata,
						// buyReplacementPattern,
						// sellReplacementPattern,
						buyOrderToSignDTO.replacementPattern,
						sellOrderToSignDTO.replacementPattern,
						buyOrderToSignDTO.staticExtradata,
						sellOrderToSignDTO.staticExtradata,
						[buyVRS.v, sellVRS.v],
						// [27, 27],
						[buyVRS.r, buyVRS.s, sellVRS.r, sellVRS.s, this.config.openSea.metadata],
					)
					console.log("functionCall.getCallInfo", await functionCall.getCallInfo())
					options = {...await getMatchOpenseaOptions(buy)}
					return {
						marketWyvern: true,
						amount: order.take.value,
						tradeData: functionCall.data,
					}
				}
				default: throw new Error("Unsupported order type")
			}
		}))
		console.log("tradeData", tradeData)
		const exchangeBulkV2Contract = createExchangeBulkV2Contract(this.ethereum, this.config.exchange.bulkV2)
		const functionCall = exchangeBulkV2Contract.functionCall(
			"bulkTransfer",
			tradeData,
		)

		return {
			functionCall,
			options,
		}
	}

	async sendTransaction(
		initial: BulkFillRequest[]
	): Promise<EthereumTransaction> {
		const {functionCall, options} = await this.getTransactionData(initial)
		return this.send(functionCall, options)
	}

	async fixForTx(order: SimpleRaribleV2Order): Promise<any> {
		if (!this.ethereum) {
			throw new Error("Wallet undefined")
		}
		const hash = hashToSign(this.config, this.ethereum, order)
		const isMakerSigner = await isSigner(this.ethereum, order.maker, hash, order.signature!)
		return orderToStruct(this.ethereum, order, !isMakerSigner)
	}

}

function addrToBytes32No0x(addr: Address) {
	return "000000000000000000000000" + addr.substring(2)
}

const buyReplacementPattern = "0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" +
"00000000000000000000000000000000000000000000000000000000000000000000000000" +
"00000000000000000000000000000000000000000000000000000000000000000000000000" +
"00000000000000000000000000000000000000000000000000000000000000000000000000" +
"00000000000000000000000000000000000000000000000000000000000000000000000000" +
"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
const sellReplacementPattern = "0x000000000000000000000000000000000000000000000000000000000000000000000000" +
"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000000000" +
"00000000000000000000000000000000000000000000000000000000000000000000000000" +
"00000000000000000000000000000000000000000000000000000000000000000000000000" +
"00000000000000000000000000000000000000000000000000000000000000000000000000" +
"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
