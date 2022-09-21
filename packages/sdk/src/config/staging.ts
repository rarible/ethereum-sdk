import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import type { EthereumConfig } from "./type"
import { FEE_CONFIG_URL } from "./common"

export const stagingEthereumConfig: EthereumConfig = {
	basePath: "https://staging-ethereum-api.rarible.org",
	chainId: 200500,
	exchange: {
		v1: ZERO_ADDRESS,
		v2: toAddress("0x5aB7F3B0A00868612e0883F4353493575D2cDCB2"),
		openseaV1: ZERO_ADDRESS,
		wrapper: ZERO_ADDRESS,
		looksrare: ZERO_ADDRESS,
		x2y2: ZERO_ADDRESS,
	},
	transferProxies: {
		nft: toAddress("0x44be0e540DfA005D97Fde86CdD058F7E1A71A317"),
		erc20: toAddress("0x6c93080188cbF7a194831818A5a965C987dC39e1"),
		erc721Lazy: toAddress("0x44a72AEb7dAc73c4b72f89d6855dE063949627F3"),
		erc1155Lazy: toAddress("0x957893927401ceF0878c538976a92a46C36ADc5f"),
		openseaV1: ZERO_ADDRESS,
		cryptoPunks: ZERO_ADDRESS,
	},
	feeConfigUrl: FEE_CONFIG_URL,
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: ZERO_ADDRESS,
	},
	factories: {
		erc721: toAddress("0x21d2AAAac56Aa438cD549f78155acF954948Dc59"),
		erc1155: toAddress("0x274c9F788D322b00857fd43E7D07cDF9F0314c37"),
	},
	cryptoPunks: {
		marketContract: ZERO_ADDRESS,
		wrapperContract: ZERO_ADDRESS,
	},
	sudoswap: {
		pairFactory: ZERO_ADDRESS,
		pairRouter: ZERO_ADDRESS,
	},
	weth: toAddress("0x379B089471603E4c26BD503E6F6C419c1666f3A6"),
	auction: ZERO_ADDRESS,
}
