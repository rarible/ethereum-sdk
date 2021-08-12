import { Config } from "./type"
import { toAddress, ZERO_ADDRESS } from "@rarible/types"

export const TEMPLATE_CONFIG: Config = {
	basePath: "https://ethereum-api.rarible.org",
	chainId: 1,
	exchange: {
		v1: ZERO_ADDRESS,
		v2: ZERO_ADDRESS
	},
	transferProxies: {
		nft: ZERO_ADDRESS,
		erc20: ZERO_ADDRESS,
		erc721Lazy: ZERO_ADDRESS,
		erc1155Lazy: ZERO_ADDRESS,
	},
}
