import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum/build"
import { toAddress, toBigNumber } from "@rarible/types"
import { createRaribleSdk } from "../../index"

describe.skip("amm", () => {
	const providerConfig = {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	}
	const { provider: providerBuyer } = createE2eProvider(
		"0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a",
		providerConfig,
	)

	const buyerWeb3 = new Web3Ethereum({ web3: new Web3(providerBuyer as any), gas: 3000000 })
	const sdkBuyer = createRaribleSdk(buyerWeb3, "testnet")

	test("try to fill order", async () => {
		const tx = await sdkBuyer.order.buy({
			order: {
				type: "AMM",
				salt: "143024" as any,
				maker: toAddress("0x4c6a766e27726f084c41e2ba98d6df8e78f8e6e1"),
				make: {
					value: toBigNumber("1"),
					assetType: {
						assetClass: "ERC721",
						contract: toAddress("0x5C31fab0ce13AF42B3A3A3391Cf02c0c078B66e9"),
						tokenId: toBigNumber("1"),
					},
				},
				take: {
					assetType: {
						assetClass: "ETH",
					},
					value: toBigNumber("15000000000000000"),
				},
				data: {
					dataType: "SUDOSWAP_AMM_DATA_V1",
					contract: toAddress("0x4Ed00990E3B086dFb1CA8A6e65AC3B8dBA61Add1"),
				},
			},
			amount: 1,
			originFees: [],
		})
		console.log(tx)
		await tx.wait()
	})
})
