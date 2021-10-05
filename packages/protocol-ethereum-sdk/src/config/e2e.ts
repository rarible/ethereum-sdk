import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import { Config } from "./type"

export const E2E_CONFIG: Config = {
	basePath: "https://ethereum-api-e2e.rarible.org",
	chainId: 17,
	exchange: {
		v1: toAddress("0x80f32a12cc4c095e2a409b70e5c96e8515e87dea"),
		v2: toAddress("0x551E4009116d489e3C5a98405A9c4B601D250B58"),
		openseaV1: ZERO_ADDRESS,
	},
	transferProxies: {
		nft: toAddress("0x66611f8d97688a0af08d4337d7846efec6995d58"),
		erc20: toAddress("0xbf558e78cfde95afbf17a4abe394cb2cc42e6270"),
		erc721Lazy: toAddress("0xe853B9994304264ff418b818A8D23FD39e8DABe6"),
		erc1155Lazy: toAddress("0x6E605A7d1FD15e9087f0756ab57E0ED99735a7a7"),
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
