import {toAddress, ZERO_ADDRESS} from "@rarible/types"
import { Config } from "./type"

export const TEMPLATE_CONFIG: Config = {
	basePath: "https://ethereum-api.rarible.org",
	chainId: 1,
	exchange: {
		v1: ZERO_ADDRESS,
		v2: ZERO_ADDRESS,
		openseaV1: ZERO_ADDRESS,
	},
	transferProxies: {
		nft: ZERO_ADDRESS,
		erc20: ZERO_ADDRESS,
		erc721Lazy: ZERO_ADDRESS,
		erc1155Lazy: ZERO_ADDRESS,
		openseaV1: ZERO_ADDRESS,
	},
	proxyRegistries: {
		openseaV1: ZERO_ADDRESS,
	},
	fees: {
		v2: 0,
	},
}
