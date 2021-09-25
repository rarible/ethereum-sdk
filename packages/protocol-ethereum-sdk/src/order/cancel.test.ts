import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import { awaitIt } from "@rarible/ethereum-sdk-test-common/src/await-it"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { randomAddress, randomWord, toAddress, toBigNumber } from "@rarible/types"
import { deployTestExchangeV2 } from "./contracts/test/test-exchange-v2"
import { cancel } from "./cancel"
import { SimpleRaribleV2Order } from "./sign-order"

const { provider, wallets } = createGanacheProvider()
const web3 = new Web3(provider as any)
const ethereum = new Web3Ethereum({ web3 })

describe("cancel order", () => {
	const v2 = awaitIt(deployTestExchangeV2(web3))

	test("ExchangeV2 should work", async () => {
		const config = {
			v1: toAddress(v2.value.options.address),
			v2: toAddress(v2.value.options.address),
		}
		const order: SimpleRaribleV2Order = {
			make: {
				assetType: {
					assetClass: "ERC1155",
					contract: randomAddress(),
					tokenId: toBigNumber("1"),
				},
				value: toBigNumber("5"),
			},
			maker: toAddress(wallets[0].getAddressString()),
			take: {
				assetType: {
					assetClass: "ERC20",
					contract: randomAddress(),
				},
				value: toBigNumber("10"),
			},
			salt: randomWord(),
			type: "RARIBLE_V2",
			data: {
				dataType: "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: [],
			},
		}
		const tx = await cancel(ethereum, config, order)
		await tx.wait()
	})
})
