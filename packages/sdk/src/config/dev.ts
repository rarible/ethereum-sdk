import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import type { EthereumConfig } from "./type"
import { FEE_CONFIG_URL } from "./common"

export const devEthereumConfig: EthereumConfig = {
	basePath: "https://dev-ethereum-api.rarible.org",
	chainId: 300500,
	exchange: {
		v1: ZERO_ADDRESS,
		v2: toAddress("0x4733791eED7d0Cfe49eD855EC21dFE5D32447938"),
		openseaV1: ZERO_ADDRESS,
	},
	transferProxies: {
		nft: toAddress("0xc6f33b62A94939E52E1b074c4aC1A801B869fDB2"),
		erc20: toAddress("0x3586d3E6CDaE98d5F0eEaB737977Bc78406Da2BD"),
		erc721Lazy: toAddress("0xeC47DA9591FC24F5a5F401e8D275526Cc5eE5d37"),
		erc1155Lazy: toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1"),
		openseaV1: ZERO_ADDRESS,
		cryptoPunks: toAddress("0x6c93080188cbF7a194831818A5a965C987dC39e1"),
	},
	feeConfigUrl: FEE_CONFIG_URL,
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: ZERO_ADDRESS,
	},
	factories: {
		erc721: toAddress("0xF3348949Db80297C78EC17d19611c263fc61f987"),
		erc1155: toAddress("0x5BD3F98d5B3C5fAfF59EC72649b2D43D3236361F"),
	},
	weth: ZERO_ADDRESS,
	auction: ZERO_ADDRESS,
}


