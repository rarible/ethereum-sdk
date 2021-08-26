import { toAddress } from "@rarible/types"
import { Config } from "./type"

export const MAINNET_CONFIG: Config = {
	basePath: "https://ethereum-api.rarible.org",
	chainId: 1,
	exchange: {
		v1: toAddress("0x09EaB21c40743B2364b94345419138eF80f39e30"),
		v2: toAddress("0x9757F2d2b135150BBeb65308D4a91804107cd8D6"),
	},
	transferProxies: {
		nft: toAddress("0x4fee7b061c97c9c496b01dbce9cdb10c02f0a0be"),
		erc20: toAddress("0xb8e4526e0da700e9ef1f879af713d691f81507d8"),
		erc721Lazy: toAddress("0xbb7829BFdD4b557EB944349b2E2c965446052497"),
		erc1155Lazy: toAddress("0x75a8B7c0B22D973E0B46CfBD3e2f6566905AA79f"),
	},
	fees: {
		v2: 0,
	},
}
