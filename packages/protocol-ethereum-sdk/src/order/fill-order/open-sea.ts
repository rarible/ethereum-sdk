import { Address, Asset } from "@rarible/protocol-api-client"
import { Ethereum, EthereumContract, EthereumSendOptions, EthereumTransaction } from "@rarible/ethereum-provider"
import { toAddress, toBigNumber, ZERO_ADDRESS } from "@rarible/types"
import { backOff } from "exponential-backoff"
import { BigNumber, toBn } from "@rarible/utils"
import { OrderOpenSeaV1DataV1 } from "@rarible/protocol-api-client/build/models/OrderData"
import { SendFunction } from "../../common/send-transaction"
import { Config } from "../../config/type"
import { createOpenseaProxyRegistryEthContract } from "../contracts/proxy-registry-opensea"
import { approveErc20 } from "../approve-erc20"
import { approveErc721 } from "../approve-erc721"
import { approveErc1155 } from "../approve-erc1155"
import { getAssetWithFee } from "../get-asset-with-fee"
import { createOpenseaContract } from "../contracts/exchange-opensea-v1"
import { toVrs } from "../../common/to-vrs"
import { waitTx } from "../../common/wait-tx"
import { SimpleOpenSeaV1Order } from "../types"
import { OpenSeaOrderDTO } from "./open-sea-types"
import { OrderHandler, OpenSeaV1OrderFillRequest } from "./types"
import { convertOpenSeaOrderToDTO } from "./open-sea-converter"

export class OpenSeaOrderHandler implements OrderHandler<OpenSeaV1OrderFillRequest> {
	constructor(
		private readonly ethereum: Ethereum,
		private readonly send: SendFunction,
		private readonly config: Config,
	) {
	}

	invert({ order }: OpenSeaV1OrderFillRequest, maker: Address) {
		if (order.data.side === "BUY" && order.make.assetType.assetClass === "ETH") {
			throw new Error("BUY order with make=ETH can be only")
		}
		if (order.data.feeRecipient === ZERO_ADDRESS) {
			throw new Error("feeRecipient should be specified")
		}
		const data: OrderOpenSeaV1DataV1 = {
			...order.data,
			feeRecipient: ZERO_ADDRESS,
			side: order.data.side === "BUY" ? "SELL" : "BUY",
		}
		return {
			...order,
			make: {
				...order.take,
			},
			take: {
				...order.make,
			},
			maker,
			taker: order.maker,
			signature: undefined,
			data,
		}
	}

	getBaseOrderFee(order: SimpleOpenSeaV1Order): number {
		if (order.data.feeRecipient === ZERO_ADDRESS) {
			return toBn(order.data.takerProtocolFee).plus(order.data.takerRelayerFee).toNumber()
		} else {
			return toBn(order.data.makerProtocolFee).plus(order.data.makerRelayerFee).toNumber()
		}
	}

	getOrderFee(order: SimpleOpenSeaV1Order): number {
		return this.getBaseOrderFee(order)
	}

	async approve(order: SimpleOpenSeaV1Order, infinite: boolean) {
		const fee = this.getOrderFee(order)
		if (order.data.side === "BUY") {
			const assetWithFee = getAssetWithFee(order.make, fee)
			await waitTx(this.approveSingle(order.maker, assetWithFee, infinite))
		} else {
			await waitTx(this.approveSingle(order.maker, order.make, infinite))
			const value = toBn(order.take.value)
				.multipliedBy(fee)
				.dividedBy(10000)
				.integerValue(BigNumber.ROUND_FLOOR)
				.toFixed()
			const feeOnly: Asset = {
				...order.take,
				value: toBigNumber(value),
			}
			await waitTx(this.approveSingle(order.maker, feeOnly, infinite))
		}
	}

	async sendTransaction(initial: SimpleOpenSeaV1Order, inverted: SimpleOpenSeaV1Order): Promise<EthereumTransaction> {
		const { buy, sell } = getBuySellOrders(initial, inverted)
		const sellOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, sell)
		const buyOrderToSignDTO = convertOpenSeaOrderToDTO(this.ethereum, buy)

		const exchangeContract = createOpenseaContract(this.ethereum, this.config.exchange.openseaV1)

		const buyVRS = toVrs(buy.signature || "")
		const sellVRS = toVrs(sell.signature || "")

		const method = exchangeContract.functionCall(
			"atomicMatch_",
			[
				...getAtomicMatchArgAddresses(buyOrderToSignDTO),
				...getAtomicMatchArgAddresses(sellOrderToSignDTO),
			],
			[...getAtomicMatchArgUints(buyOrderToSignDTO), ...getAtomicMatchArgUints(sellOrderToSignDTO)],
			[...getAtomicMatchArgCommonData(buyOrderToSignDTO), ...getAtomicMatchArgCommonData(sellOrderToSignDTO)],
			buyOrderToSignDTO.calldata,
			sellOrderToSignDTO.calldata,
			buyOrderToSignDTO.replacementPattern,
			sellOrderToSignDTO.replacementPattern,
			buyOrderToSignDTO.staticExtradata,
			sellOrderToSignDTO.staticExtradata,
			[buyVRS.v, sellVRS.v],
			[buyVRS.r, buyVRS.s, sellVRS.r, sellVRS.s, this.config.openSea.metadata],
		)

		return this.send(method, await getMatchOpenseaOptions(buy))
	}

	async approveSingle(
		maker: Address,
		asset: Asset,
		infinite: undefined | boolean = true,
	): Promise<EthereumTransaction | undefined> {
		switch (asset.assetType.assetClass) {
			case "ERC20": {
				const contract = asset.assetType.contract
				const operator = this.config.transferProxies.openseaV1
				return approveErc20(this.ethereum, this.send, contract, maker, operator, asset.value, infinite)
			}
			case "ERC721": {
				const contract = asset.assetType.contract
				const proxyAddress = await this.getRegisteredProxy(maker)
				return approveErc721(this.ethereum, this.send, contract, maker, proxyAddress)
			}
			case "ERC1155": {
				const contract = asset.assetType.contract
				const proxyAddress = await this.getRegisteredProxy(maker)
				return approveErc1155(this.ethereum, this.send, contract, maker, proxyAddress)
			}
			default:
				return undefined
		}
	}

	private async getRegisteredProxy(maker: Address): Promise<Address> {
		const proxyRegistry = this.config.openSea.proxyRegistry
		const proxyRegistryContract = createOpenseaProxyRegistryEthContract(this.ethereum, proxyRegistry)
		const proxyAddress = await getSenderProxy(proxyRegistryContract, maker)

		if (proxyAddress === ZERO_ADDRESS) {
			const registerTx = await proxyRegistryContract.functionCall("registerProxy").send()
			await registerTx.wait()

			return backOff(async () => {
				const value = await getSenderProxy(proxyRegistryContract, maker)
				if (value === ZERO_ADDRESS) {
					throw new Error("Expected non-zero proxy address")
				}
				return value
			}, {
				maxDelay: 500,
				numOfAttempts: 10,
				delayFirstAttempt: true,
				startingDelay: 100,
			})
		}

		return proxyAddress
	}
}

async function getMatchOpenseaOptions(buy: SimpleOpenSeaV1Order): Promise<EthereumSendOptions> {
	if (buy.make.assetType.assetClass === "ETH") {
		const fee = toBn(buy.data.takerProtocolFee).plus(buy.data.takerRelayerFee).toNumber()
		const assetWithFee = getAssetWithFee(buy.make, fee)
		return { value: assetWithFee.value }
	} else {
		return {}
	}
}

async function getSenderProxy(registryContract: EthereumContract, sender: Address) {
	return toAddress(await registryContract.functionCall("proxies", sender).call())
}

function getBuySellOrders(left: SimpleOpenSeaV1Order, right: SimpleOpenSeaV1Order) {
	if (left.data.side === "SELL") {
		return {
			buy: right,
			sell: left,
		}
	} else {
		return {
			buy: left,
			sell: right,
		}
	}
}

export function getAtomicMatchArgAddresses(dto: OpenSeaOrderDTO) {
	return [dto.exchange, dto.maker, dto.taker, dto.feeRecipient, dto.target, dto.staticTarget, dto.paymentToken]
}

export function getAtomicMatchArgUints(dto: OpenSeaOrderDTO) {
	return [
		dto.makerRelayerFee,
		dto.takerRelayerFee,
		dto.makerProtocolFee,
		dto.takerProtocolFee,
		dto.basePrice,
		dto.extra,
		dto.listingTime,
		dto.expirationTime,
		dto.salt,
	]
}

export function getAtomicMatchArgCommonData(dto: OpenSeaOrderDTO) {
	return [dto.feeMethod, dto.side, dto.saleKind, dto.howToCall]
}
