import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { Address, CryptoPunksAssetType } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import { toAddress } from "@rarible/types"
import type { ExchangeAddresses } from "../config/type"
import { toVrs } from "../common/to-vrs"
import { createCryptoPunksMarketContract } from "../nft/contracts/cryptoPunks"
import type { SendFunction } from "../common/send-transaction"
import { createExchangeV1Contract } from "./contracts/exchange-v1"
import { createExchangeV2Contract } from "./contracts/exchange-v2"
import { createOpenseaContract } from "./contracts/exchange-opensea-v1"
import { toStructLegacyOrderKey } from "./fill-order/rarible-v1"
import { getAtomicMatchArgAddresses, getAtomicMatchArgUints } from "./fill-order/open-sea"
import type {
	SimpleCryptoPunkOrder,
	SimpleLegacyOrder,
	SimpleOpenSeaV1Order,
	SimpleOrder,
	SimpleRaribleV2Order, SimpleSeaportV1Order,
} from "./types"
import { orderToStruct } from "./sign-order"
import { convertOpenSeaOrderToDTO } from "./fill-order/open-sea-converter"
import type { CheckLazyOrderPart } from "./check-lazy-order"
import { createSeaportContract } from "./contracts/seaport"
import { CROSS_CHAIN_SEAPORT_ADDRESS } from "./fill-order/seaport-utils/constants"
import { convertAPIOrderToSeaport } from "./fill-order/seaport-utils/convert-to-seaport-order"

export async function cancel(
	checkLazyOrder: (form: CheckLazyOrderPart) => Promise<CheckLazyOrderPart>,
	ethereum: Maybe<Ethereum>,
	send: SendFunction,
	config: ExchangeAddresses,
	checkWalletChainId: () => Promise<boolean>,
	orderToCheck: SimpleOrder,
): Promise<EthereumTransaction> {
	await checkWalletChainId()
	if (ethereum) {
		const order = await checkLazyOrder(orderToCheck) as SimpleOrder
		switch (order.type) {
			case "RARIBLE_V1":
				return cancelLegacyOrder(ethereum, send, config.v1, order)
			case "RARIBLE_V2":
				return cancelV2Order(ethereum, send, config.v2, order)
			case "OPEN_SEA_V1":
				return cancelOpenseaOrderV1(ethereum, send, order)
			case "SEAPORT_V1":
				return cancelSeaportOrder(ethereum, send, order)
			case "CRYPTO_PUNK":
				return cancelCryptoPunksOrder(ethereum, send, order)
			default:
				throw new Error(`Unsupported order: ${JSON.stringify(order)}`)
		}
	}
	throw new Error("Wallet undefined")
}

async function cancelLegacyOrder(ethereum: Ethereum, send: SendFunction, contract: Address, order: SimpleLegacyOrder) {
	const v1 = createExchangeV1Contract(ethereum, contract)
	return send(v1.functionCall("cancel", toStructLegacyOrderKey(order)))
}

async function cancelV2Order(ethereum: Ethereum, send: SendFunction, contract: Address, order: SimpleRaribleV2Order) {
	const v2 = createExchangeV2Contract(ethereum, contract)
	return send(v2.functionCall("cancel", orderToStruct(ethereum, order)))
}

export function cancelOpenseaOrderV1(
	ethereum: Ethereum, send: SendFunction, order: SimpleOpenSeaV1Order
) {
	const exchangeContract = createOpenseaContract(ethereum, order.data.exchange)

	const dto = convertOpenSeaOrderToDTO(ethereum, order)
	const makerVRS = toVrs(order.signature || "0x")

	return send(
		exchangeContract.functionCall(
			"cancelOrder_",
			getAtomicMatchArgAddresses(dto),
			getAtomicMatchArgUints(dto),
			dto.feeMethod,
			dto.side,
			dto.saleKind,
			dto.howToCall,
			dto.calldata,
			dto.replacementPattern,
			dto.staticExtradata,
			makerVRS.v,
			makerVRS.r,
			makerVRS.s,
		)
	)
}

export function cancelCryptoPunksOrder(ethereum: Ethereum, send: SendFunction, order: SimpleCryptoPunkOrder) {
	if (order.make.assetType.assetClass === "CRYPTO_PUNKS") {
		return cancelCryptoPunkOrderByAsset(ethereum, send, "punkNoLongerForSale", order.make.assetType)
	} else if (order.take.assetType.assetClass === "CRYPTO_PUNKS") {
		return cancelCryptoPunkOrderByAsset(ethereum, send, "withdrawBidForPunk", order.take.assetType)
	} else {
		throw new Error("Crypto punks asset has not been found")
	}
}

export function cancelCryptoPunkOrderByAsset(
	ethereum: Ethereum, send: SendFunction, methodName: string, assetType: CryptoPunksAssetType
) {
	const ethContract = createCryptoPunksMarketContract(ethereum, assetType.contract)
	return send(ethContract.functionCall(methodName, assetType.tokenId))
}

export async function cancelSeaportOrder(
	ethereum: Ethereum, send: SendFunction, order: SimpleSeaportV1Order
) {
	// const accountAddress = await ethereum.getFrom()
	// const provider = getSeaportProvider(ethereum)
	// const signer = provider.getSigner(accountAddress)
	// const multicallProvider = new multicallProviders.MulticallProvider(provider)

	const orderParams = convertAPIOrderToSeaport(order).parameters

	const seaport = createSeaportContract(ethereum, toAddress(CROSS_CHAIN_SEAPORT_ADDRESS))
	return send(seaport.functionCall("cancel", [orderParams]))
	// const contract = new Contract(
	// 	CROSS_CHAIN_SEAPORT_ADDRESS,
	// 	SeaportABI,
	// 	multicallProvider
	// ) as SeaportContract
	// const methods = await getTransactionMethods(contract.connect(signer), "cancel", [
	// 	[orderParams],
	// ])
	// return new EthersTransaction(await methods.transact())
}
