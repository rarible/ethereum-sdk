import { Address } from "@rarible/protocol-api-client"

export type Config = {
	chainId: number
	exchange: ExchangeAddresses
	transferProxies: TransferProxies
}

export type TransferProxies = {
	nft: Address,
	erc20: Address,
	erc721Lazy: Address,
	erc1155Lazy: Address
}

export type ExchangeAddresses = {
	v1: Address,
	v2: Address
}
