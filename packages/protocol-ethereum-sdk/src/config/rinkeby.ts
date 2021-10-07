import { toAddress } from "@rarible/types"
import { id32 } from "../common/id"
import { Config } from "./type"

export const RINKEBY_CONFIG: Config = {
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
	},
	fees: {
		v2: 0,
	},
	openSea: {
		metadata: id32("RARIBLE"),
		proxyRegistry: toAddress("0xf57b2c51ded3a29e6891aba85459d600256cf317"),
	},
	nftContracts: {
		erc721: {
			v2: toAddress("0x509FD4cdAa29Be7B1fAD251d8Ea0fCA2Ca91eb60"),
			v3: toAddress("0x6ede7f3c26975aad32a475e1021d8f6f39c89d82"),
		},
		erc1155: {
			v1: toAddress("0x2eBecaBBbe8a8C629b99aB23ed154d74CD5d4342"),
			v2: toAddress("0x1AF7A7555263F275433c6Bb0b8FdCD231F89B1D7"),
		},
	},
}
