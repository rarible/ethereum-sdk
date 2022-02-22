import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import type { EthereumConfig } from "./type"
import { FEE_CONFIG_URL } from "./common"

export const devPolygonConfig: EthereumConfig = {
	basePath: "https://dev-polygon-api.rarible.org",
	chainId: 300501,
	exchange: {
		v1: ZERO_ADDRESS,
		v2: toAddress("0x8283Ffd0F535E1103C3599D2d00b85815774A896"),
		openseaV1: ZERO_ADDRESS,
	},
	transferProxies: {
		nft: toAddress("0xc6f33b62A94939E52E1b074c4aC1A801B869fDB2"),
		erc20: toAddress("0x3586d3E6CDaE98d5F0eEaB737977Bc78406Da2BD"),
		erc721Lazy: toAddress("0xeC47DA9591FC24F5a5F401e8D275526Cc5eE5d37"),
		erc1155Lazy: toAddress("0x8812cFb55853da0968a02AaaEA84CD93EC4b42A1"),
		openseaV1: ZERO_ADDRESS,
		cryptoPunks: toAddress("0x04E4bd4DE3C972B92Cd35B7a2B78Ef55225B210E"),
	},
	feeConfigUrl: FEE_CONFIG_URL,
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: ZERO_ADDRESS,
	},
	factories: {
		erc721: toAddress("0x66611f8D97688A0aF08D4337D7846eFEc6995d58"),
		erc1155: toAddress("0x55eB2809896aB7414706AaCDde63e3BBb26e0BC6"),
	},
	weth: ZERO_ADDRESS,
	auction: ZERO_ADDRESS,
}
