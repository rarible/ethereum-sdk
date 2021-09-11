import { toAddress, toBigNumber, toBinary } from "@rarible/types"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { provider } from "web3-core"
import { assetTypeToStruct } from "./asset-type-to-struct"

describe("assetTypeToStruct", () => {
	const { provider } = createGanacheProvider()
	const web3 = new Web3(provider as unknown as provider)
	const ethereum = new Web3Ethereum({ web3 })

	test("encodes ERC20", () => {
		const result = assetTypeToStruct(ethereum, {
			assetClass: "ERC20",
			contract: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"),
		})
		expect(result).toStrictEqual({
			assetClass: "0x8ae85d84",
			data: "0x00000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be",
		})
	})

	test("encodes GEN_ART", () => {
		const result = assetTypeToStruct(ethereum, {
			assetClass: "GEN_ART",
			contract: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"),
		})
		expect(result).toStrictEqual({
			assetClass: "0xa8c6716e",
			data: "0x00000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be",
		})
	})

	test("encodes ERC721_LAZY", () => {
		const result = assetTypeToStruct(ethereum, {
			assetClass: "ERC721_LAZY",
			...COMMON_PART,
		})
		expect(result).toStrictEqual({
			assetClass: "0xd8f960c1",
			data:
				"0x00000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000047465737400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be000000000000000000000000000000000000000000000000000000000000006400000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000000200000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be000000000000000000000000000000000000000000000000000000000000006400000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
		})
	})

	test("encodes ERC1155_LAZY", () => {
		const result = assetTypeToStruct(ethereum, {
			assetClass: "ERC1155_LAZY",
			...COMMON_PART,
			supply: toBigNumber("10"),
		})
		expect(result).toStrictEqual({
			assetClass: "0x1cdfaa40",
			data:
				"0x00000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000047465737400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be000000000000000000000000000000000000000000000000000000000000006400000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000000200000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be000000000000000000000000000000000000000000000000000000000000006400000000000000000000000044953ab2e88391176576d49ca23df0b8acd793be0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
		})
	})
})

const COMMON_PART = {
	contract: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"),
	tokenId: toBigNumber("10"),
	uri: "test",
	royalties: [
		{ account: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"), value: 100 },
		{ account: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"), value: 100 },
	],
	creators: [
		{ account: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"), value: 100 },
		{ account: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"), value: 100 },
	],
	signatures: [toBinary("0x")],
}
