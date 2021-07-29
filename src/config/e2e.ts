import { Config } from "./type"
import { toAddress } from "@rarible/types"

export const E2E_CONFIG: Config = {
	chainId: 17,
	exchange: {
		v1: toAddress("0x80f32a12cc4c095e2a409b70e5c96e8515e87dea"),
		v2: toAddress("0x551E4009116d489e3C5a98405A9c4B601D250B58")
	},
	transferProxies: {
		nft: toAddress("0x66611f8d97688a0af08d4337d7846efec6995d58"),
		erc20: toAddress("0xbf558e78cfde95afbf17a4abe394cb2cc42e6270"),
		erc721Lazy: toAddress("0xbf558e78cfde95afbf17a4abe394cb2cc42e6270"),//todo
		erc1155Lazy: toAddress("0xbf558e78cfde95afbf17a4abe394cb2cc42e6270"),//todo
	},
}
