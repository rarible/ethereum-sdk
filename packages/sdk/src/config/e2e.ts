import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import type { EthereumConfig } from "./type"
import { FEE_CONFIG_URL } from "./common"

export const e2eConfig: EthereumConfig = {
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
		cryptoPunks: toAddress("0x3268d39B77A7F189209E87E13eedA613098b32c7"),
	},
	feeConfigUrl: FEE_CONFIG_URL,
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: ZERO_ADDRESS,
	},
	factories: {
		erc721: toAddress("0x74B4721599213fdC7eD0bb67D3B25a6fb3c74B61"),
		erc1155: toAddress("0xF35BC450544C7d8c2559B4DAeb51E9617F39e7C6"),
	},
	weth: toAddress("0xc6f33b62a94939e52e1b074c4ac1a801b869fdb2"),
	auction: toAddress("0xE091e5511815107072ed1C42d0d00f151D6197ed"),
}
