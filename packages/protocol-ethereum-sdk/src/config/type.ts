import {Address, Binary} from "@rarible/protocol-api-client"
import {BigNumber, Word} from "@rarible/types"
import BN from "bignumber.js"

export type ExchangeFees = {
	v2: number
}

export type ExchangeAddresses = {
	v1: Address
	v2: Address
	openseaV1: Address
}

export type TransferProxies = {
	nft: Address
	erc20: Address
	erc721Lazy: Address
	erc1155Lazy: Address
	openseaV1: Address
}

export type ProxyRegistries = {
	openseaV1: Address
}

export type Config = {
	basePath: string
	chainId: number
	exchange: ExchangeAddresses
	transferProxies: TransferProxies
	proxyRegistries: ProxyRegistries
	fees: ExchangeFees
}


export enum OrderOpenSeaV1DataV1FeeMethod {
	PROTOCOL_FEE,
	SPLIT_FEE
}

export enum OrderOpenSeaV1DataV1Side {
	BUY,
	SELL
}

export enum OrderOpenSeaV1DataV1SaleKind {
	FIXED_PRICE,
	DUTCH_AUCTION
}

export enum OrderOpenSeaV1DataV1HowToCall {
	CALL,
	DELEGATE_CALL
}

export type ValueOf<T> = T[keyof T]

export type OpenSeaOrderToSignDTO = {
	exchange: Address
	maker: Address
	taker: Address
	makerRelayerFee: BigNumber
	takerRelayerFee: BigNumber
	makerProtocolFee: BigNumber
	takerProtocolFee: BigNumber
	feeRecipient: Address
	// feeMethod: ValueOf<OrderOpenSeaV1DataV1FeeMethod>
	feeMethod: OrderOpenSeaV1DataV1FeeMethod
	side: OrderOpenSeaV1DataV1Side
	saleKind: OrderOpenSeaV1DataV1SaleKind
	target: Address
	howToCall: OrderOpenSeaV1DataV1HowToCall
	calldata: Binary
	replacementPattern: Binary
	staticTarget: Address
	staticExtradata: Binary
	paymentToken: Address
	basePrice: BigNumber
	extra: BigNumber
	listingTime: BigNumber
	expirationTime: BigNumber
	salt: BigNumber
}
