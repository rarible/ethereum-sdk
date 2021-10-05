import { ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import { Config } from "./type"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TEMPLATE_CONFIG: Config = {
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
	fees: {
		v2: 0,
	},
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: ZERO_ADDRESS,
	},
}
