import { toBigNumber } from "@rarible/types/build/big-number"
import { toAddress } from "@rarible/types/build/address"
import { toWord } from "@rarible/types"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { provider } from "web3-core"
import { hashLegacyOrder } from "./hash-legacy-order"

describe("hashLegacyOrder", () => {
	const { provider } = createGanacheProvider()
	const web3 = new Web3(provider as unknown as provider)
	const ethereum = new Web3Ethereum({ web3 })
	test("simple order is hashed correctly", () => {
		const hash = hashLegacyOrder(ethereum, {
			type: "RARIBLE_V1",
			data: {
				dataType: "LEGACY",
				fee: 1,
			},
			salt: toWord("0x000000000000000000000000000000000000000000000000000000000000000a"),
			maker: toAddress("0x10aea70c91688485a9c2f602d0a8dd438c75ea41"),
			make: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress("0x1685975920792048e861647c1b1b6f22318215fa"),
				},
				value: toBigNumber("10"),
			},
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress("0x44953ab2e88391176576d49ca23df0b8acd793be"),
				},
				value: toBigNumber("5"),
			},
		})

		expect(hash).toBe("0xc1da10c91abd6133109b4dfd20c106887493a0893eec49f2980b1b43c608ad02")
	})
})
