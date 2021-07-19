import { toAddress } from "@rarible/types/build/address"
import { Address } from "@rarible/protocol-api-client"
import { getAddressByChainId } from "../common/get-address-by-chain-id"

const EXCHANGE_V1_ADDRESS = {
	1: toAddress("0x09EaB21c40743B2364b94345419138eF80f39e30"),
	3: toAddress("0xd782A10D023828d283f7b943Ae0fc3F07B2952d9"),
	4: toAddress("0xda381535565b97640a6453fa7a1a7b161af78cbe"),
	17: toAddress("0x80f32a12cc4c095e2a409b70e5c96e8515e87dea")
}

const EXCHANGE_V2_ADDRESS = {
	1: toAddress("0x9757F2d2b135150BBeb65308D4a91804107cd8D6"),
	3: toAddress("0x33Aef288C093Bf7b36fBe15c3190e616a993b0AD"),
	4: toAddress("0xd4a57a3bD3657D0d46B4C5bAC12b3F156B9B886b"),
	17: toAddress("0x551E4009116d489e3C5a98405A9c4B601D250B58")
}

//todo fill these addresses
const ERC20_TRANSFER_PROXY_ADDRESS = {
	1: toAddress("0x9757F2d2b135150BBeb65308D4a91804107cd8D6"),
	3: toAddress("0x33Aef288C093Bf7b36fBe15c3190e616a993b0AD"),
	4: toAddress("0xd4a57a3bD3657D0d46B4C5bAC12b3F156B9B886b"),
	17: toAddress("0x551E4009116d489e3C5a98405A9c4B601D250B58")
}

//todo fill these addresses
const TRANSFER_PROXY_ADDRESS = {
	1: toAddress("0x9757F2d2b135150BBeb65308D4a91804107cd8D6"),
	3: toAddress("0x33Aef288C093Bf7b36fBe15c3190e616a993b0AD"),
	4: toAddress("0xd4a57a3bD3657D0d46B4C5bAC12b3F156B9B886b"),
	17: toAddress("0x551E4009116d489e3C5a98405A9c4B601D250B58")
}

export function getErc20TransferProxyAddress(chainId: number): Address {
	return getAddressByChainId(ERC20_TRANSFER_PROXY_ADDRESS, chainId)
}

export function getTransferProxyAddress(chainId: number): Address {
	return getAddressByChainId(TRANSFER_PROXY_ADDRESS, chainId)
}

export function getExhangeV1Address(chainId: number): Address {
	return getAddressByChainId(EXCHANGE_V1_ADDRESS, chainId)
}

export function getExhangeV2Address(chainId: number): Address {
	return getAddressByChainId(EXCHANGE_V2_ADDRESS, chainId)
}
