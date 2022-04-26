import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import { id32 } from "../common/id"
import type { EthereumConfig } from "./type"
import { FEE_CONFIG_URL } from "./common"

export const ropstenConfig: EthereumConfig = {
	basePath: "https://ethereum-api-dev.rarible.org",
	chainId: 3,
	exchange: {
		v1: toAddress("0xd782A10D023828d283f7b943Ae0fc3F07B2952d9"),
		v2: toAddress("0x33Aef288C093Bf7b36fBe15c3190e616a993b0AD"),
		openseaV1: toAddress("0x5206e78b21ce315ce284fb24cf05e0585a93b1d9"),
		bulkV2: toAddress("0x46078AA283B12CEbeE235C111b2710BbEc944a10"),
	},
	transferProxies: {
		nft: toAddress("0xf8e4ecac18b65fd04569ff1f0d561f74effaa206"),
		erc20: toAddress("0xa5a51d7b4933185da9c932e5375187f661cb0c69"),
		erc721Lazy: toAddress("0x6c49c170c82C40709a32Fb4E827ad3011CD86227"),
		erc1155Lazy: toAddress("0x9F7fBc52A53f85e57a5DAde35dFa14797A4dA412"),
		openseaV1: toAddress("0xB85F469A2a14D66FEf34E9810De2AA0AD6Ce0FD9"),
		cryptoPunks: toAddress("0x6B8ABca06F4D08310dc09540B8E27E5A0D9572E9"),
	},
	feeConfigUrl: FEE_CONFIG_URL,
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: toAddress("0xADF4b557574B18EC00e19De641db4e264b2F5e20"),
		merkleValidator: toAddress("0x50a494325f2eAd6eFf951BF02B2f3D3fC4b4b492"),
	},
	factories: {
		erc721: toAddress("0x939d0308CE4274C287E7305D381B336B77dBfcd3"),
		erc1155: toAddress("0xccf0cB91Fe5cCb697781427C141ed0662aE4FE2e"),
	},
	weth: toAddress("0xc778417e063141139fce010982780140aa0cd5ab"),
	auction: ZERO_ADDRESS,
}
