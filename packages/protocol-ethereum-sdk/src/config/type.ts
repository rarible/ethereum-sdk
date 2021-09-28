import {Address} from "@rarible/protocol-api-client"

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
