import { toAddress } from "@rarible/types"
import { id32 } from "../common/id"
import type { EthereumConfig } from "./type"

export const rinkebyConfig: EthereumConfig = {
	basePath: "https://ethereum-api-staging.rarible.org",
	chainId: 4,
	exchange: {
		v1: toAddress("0xda381535565b97640a6453fa7a1a7b161af78cbe"),
		v2: toAddress("0xd4a57a3bD3657D0d46B4C5bAC12b3F156B9B886b"),
		openseaV1: toAddress("0x5206e78b21ce315ce284fb24cf05e0585a93b1d9"),
	},
	transferProxies: {
		nft: toAddress("0x7d47126a2600e22eab9ed6cf0e515678727779a6"),
		erc20: toAddress("0x2fce8435f0455edc702199741411dbcd1b7606ca"),
		erc721Lazy: toAddress("0x75fDbe19C2dc673384dDc14C9F453dB86F5f32E8"),
		erc1155Lazy: toAddress("0x0cF0AAb68432a3710ECbf2f1b112a11cEe31a83C"),
		openseaV1: toAddress("0x82d102457854c985221249f86659c9d6cf12aa72"),
		cryptoPunks: toAddress("0x8B278D35388EF6Bda06da69292C5B1A5A8C59c4f"),
	},
	fees: {
		v2: 0,
	},
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: toAddress("0xf57b2c51ded3a29e6891aba85459d600256cf317"),
	},
	factories: {
		erc721: toAddress("0x31575E4426d195f6082aDdcD44e97cB4CEa1291C"),
		erc721User: toAddress("0xe5bF86F2FC1e0C704A8b2C095aD92C59100C63Ac"),
		erc1155: toAddress("0x3Df4035EC62B97b5e3B5f160Cb84dCe4A9CB545D"),
		erc1155User: toAddress("0x5a5773ac6b87f15dF215A78BEfdce478C33D8418"),
	},
}
