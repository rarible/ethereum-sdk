import { toAddress } from "@rarible/types"
import { Config } from "./type"

export const ROPSTEN_CONFIG: Config = {
	basePath: "https://ethereum-api-dev.rarible.org",
	chainId: 3,
	exchange: {
		v1: toAddress("0xd782A10D023828d283f7b943Ae0fc3F07B2952d9"),
		v2: toAddress("0x33Aef288C093Bf7b36fBe15c3190e616a993b0AD"),
	},
	transferProxies: {
		nft: toAddress("0xf8e4ecac18b65fd04569ff1f0d561f74effaa206"),
		erc20: toAddress("0xa5a51d7b4933185da9c932e5375187f661cb0c69"),
		erc721Lazy: toAddress("0x6c49c170c82C40709a32Fb4E827ad3011CD86227"),
		erc1155Lazy: toAddress("0x9F7fBc52A53f85e57a5DAde35dFa14797A4dA412"),
	},
	fees: {
		v2: 0,
	},
}
