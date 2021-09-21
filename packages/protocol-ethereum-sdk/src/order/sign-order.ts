import {Asset, Binary, EIP712Domain, LegacyOrder, OpenSeaV1Order, RaribleV2Order} from "@rarible/protocol-api-client"
import {Address, BigNumber, toAddress, toBigNumber, toBinary, ZERO_ADDRESS} from "@rarible/types"
import {Ethereum, signTypedData} from "@rarible/ethereum-provider"
import Web3 from "web3"
import {toBn} from "@rarible/utils"
import {
	Config, OpenSeaOrderToSignDTO,
	OrderOpenSeaV1DataV1FeeMethod, OrderOpenSeaV1DataV1HowToCall,
	OrderOpenSeaV1DataV1SaleKind,
	OrderOpenSeaV1DataV1Side,
} from "../config/type"
import {hashLegacyOrder} from "./hash-legacy-order"
import {assetTypeToStruct} from "./asset-type-to-struct"
import {EIP712_DOMAIN_TEMPLATE, EIP712_ORDER_TYPE, EIP712_ORDER_TYPES} from "./eip712"
import {encodeData} from "./encode-data"
import {isNft} from "./is-nft"

export type SimpleLegacyOrder =
    Pick<LegacyOrder, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleRaribleV2Order =
    Pick<RaribleV2Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleOpenSeaV1Order =
    Pick<OpenSeaV1Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleOrder =
    SimpleLegacyOrder |
    SimpleRaribleV2Order |
    SimpleOpenSeaV1Order

export async function signOrder(
	ethereum: Ethereum,
	config: Pick<Config, "exchange" | "chainId">,
	order: SimpleOrder
): Promise<Binary> {
	switch (order.type) {
		case "RARIBLE_V1": {
			const legacyHash = hashLegacyOrder(ethereum, order)
			return toBinary(await ethereum.personalSign(legacyHash.substring(2)))
		}
		case "RARIBLE_V2": {
			const domain = createEIP712Domain(config.chainId, config.exchange.v2)
			const signature = await signTypedData(ethereum, {
				primaryType: EIP712_ORDER_TYPE,
				domain,
				types: EIP712_ORDER_TYPES,
				message: orderToStruct(ethereum, order),
			})
			return toBinary(signature)
		}

		case "OPEN_SEA_V1": {
			// const orderHash = hashOpenSeaV1Order(order, config.)
			//
			// const hash = hashToSign(orderHash)
			// return toBinary(hash)
		}

		default: {
			throw new Error(`Unsupported order type: ${(order as any).type}`)
		}
	}
}

export function getPaymentAsset(order: SimpleOrder): Asset | undefined {
	if (!isNft(order.make.assetType)) {
		return order.make
	} else if (!isNft(order.take.assetType)) {
		return order.take
	}
	return undefined
}

export function getPaymentNftAsset(order: SimpleOrder): Asset | undefined {
	if (isNft(order.make.assetType)) {
		return order.make
	} else if (isNft(order.take.assetType)) {
		return order.take
	}
	return undefined
}

export function getAssetTypeToken(asset: Asset): Address {
	switch (asset.assetType.assetClass) {
		case "ETH":
			return ZERO_ADDRESS
		case "ERC20":
			return asset.assetType.contract
		case "ERC721":
			return asset.assetType.contract
		case "ERC721_LAZY":
			return asset.assetType.contract
		case "ERC1155":
			return asset.assetType.contract
		case "ERC1155_LAZY":
			return asset.assetType.contract
		default: {
			throw new Error("Unsupported asset type")
		}
	}
}

export function convertOpenSeaOrderToSignDTO(order: SimpleOpenSeaV1Order): OpenSeaOrderToSignDTO {
	const paymentAsset = getPaymentAsset(order)
	if (!paymentAsset) {
		throw new Error("Maker or taker should have an ERC20 asset")
	}

	const nftAsset = getPaymentNftAsset(order)
	if (!nftAsset) {
		throw new Error("Maker or taker should have an NFT asset")
	}

	return {
		exchange: toAddress(order.data.exchange),
		maker: toAddress(order.maker),
		taker: toAddress(order.taker || ZERO_ADDRESS),
		makerRelayerFee: toBigNumber(order.data.makerRelayerFee),
		takerRelayerFee: toBigNumber(order.data.takerRelayerFee),
		makerProtocolFee: toBigNumber(order.data.makerProtocolFee),
		takerProtocolFee: toBigNumber(order.data.takerProtocolFee),
		feeRecipient: order.data.feeRecipient,
		feeMethod: OrderOpenSeaV1DataV1FeeMethod[order.data.feeMethod],
		side: OrderOpenSeaV1DataV1Side[order.data.side],
		saleKind: OrderOpenSeaV1DataV1SaleKind[order.data.saleKind],
		// target: getAssetTypeToken(nftAsset),
		target: ZERO_ADDRESS,
		howToCall: OrderOpenSeaV1DataV1HowToCall[order.data.howToCall],
		calldata: order.data.callData,
		replacementPattern: order.data.replacementPattern,
		staticTarget: order.data.staticTarget,
		staticExtradata: order.data.staticExtraData,
		// paymentToken: getAssetTypeToken(paymentAsset),
		// basePrice: toBigNumber(paymentAsset.value),
		paymentToken: getAssetTypeToken(order.make),
		basePrice: toBigNumber(order.make.value),
		extra: toBigNumber(order.data.extra),
		listingTime: toBigNumber(String(order.start || 0)),
		expirationTime: toBigNumber(String(order.end || 0)),
		salt: toBigNumber(toBn(order.salt).toString(10)),
	}
}

export function hashOrder(order: OpenSeaOrderToSignDTO): string {
	return Web3.utils.soliditySha3(
		{t: "address", v: order.exchange},
		{t: "address", v: order.maker},
		{t: "address", v: order.taker},
		{t: "uint", v: order.makerRelayerFee},
		{t: "uint", v: order.takerRelayerFee},
		{t: "uint", v: order.makerProtocolFee},
		{t: "uint", v: order.takerProtocolFee},
		{t: "address", v: order.feeRecipient},
		{t: "uint8", v: order.feeMethod},
		{t: "uint8", v: order.side},
		{t: "uint8", v: order.saleKind},
		{t: "address", v: order.target},
		{t: "uint8", v: order.howToCall},
		{t: "bytes", v: order.calldata},
		{t: "bytes", v: order.replacementPattern},
		{t: "address", v: order.staticTarget},
		{t: "bytes", v: order.staticExtradata},
		{t: "address", v: order.paymentToken},
		{t: "uint", v: order.basePrice},
		{t: "uint", v: order.extra},
		{t: "uint", v: order.listingTime},
		{t: "uint", v: order.expirationTime},
		{t: "uint", v: order.salt}
	) as string
}

export function hashToSign(hash: string): string {
	return Web3.utils.soliditySha3(
		{type: "string", value: "\x19Ethereum Signed Message:\n32"},
		{type: "bytes32", value: hash}
	) || ""
}

export function hashOpenSeaV1Order(order: SimpleOpenSeaV1Order, transferProxy: Address): string {
	const orderDTO = convertOpenSeaOrderToSignDTO(order)
	orderDTO.target = transferProxy
	return hashOrder(orderDTO)
}

function createEIP712Domain(chainId: number, verifyingContract: Address): EIP712Domain {
	return {
		...EIP712_DOMAIN_TEMPLATE,
		verifyingContract: verifyingContract,
		chainId,
	}
}

export function orderToStruct(ethereum: Ethereum, order: SimpleOrder) {
	const [dataType, data] = encodeData(ethereum, order.data)
	return {
		maker: order.maker,
		makeAsset: assetToStruct(ethereum, order.make),
		taker: order.taker ?? ZERO_ADDRESS,
		takeAsset: assetToStruct(ethereum, order.take),
		salt: order.salt,
		start: order.start ?? 0,
		end: order.end ?? 0,
		dataType,
		data,
	}
}

function assetToStruct(ethereum: Ethereum, asset: Asset) {
	return {
		assetType: assetTypeToStruct(ethereum, asset.assetType),
		value: asset.value,
	}
}
