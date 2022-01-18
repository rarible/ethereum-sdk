import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import type { EthereumConfig } from "./type"

export const mumbaiConfig: EthereumConfig = {
	basePath: "https://polygon-api-staging.rarible.org",
	chainId: 80001,
	exchange: {
		v1: ZERO_ADDRESS,
		v2: toAddress("0x4F05968D804902dd827Dd0F4fB37Ccc3071C4Bb5"),
		openseaV1: ZERO_ADDRESS,
	},
	transferProxies: {
		nft: toAddress("0x02e21199D043dab90248f79d6A8d0c36832734B0"),
		erc20: toAddress("0xCA90c2E7d3c41EF220888B0038849BA1e67688bC"),
		erc721Lazy: toAddress("0xA8628124C255171cF356F0E0204E2D19CA89F636"),
		erc1155Lazy: toAddress("0x8fd27f771bf72C1F8c8b78FCdcf323C0C34f030b"),
		openseaV1: ZERO_ADDRESS,
		cryptoPunks: ZERO_ADDRESS,
	},
	fees: {
		v2: 0,
	},
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: ZERO_ADDRESS,
	},
	factories: {
		erc721: toAddress("0xa85180a21786bA65b0778bE1cb5CBA5E5c6cD21d"),
		erc1155: toAddress("0xAa9CD5834E0009902EeAA3FEfAc6A160e9A096b4"),
	},
	weth: ZERO_ADDRESS,
	auction: ZERO_ADDRESS,
}
