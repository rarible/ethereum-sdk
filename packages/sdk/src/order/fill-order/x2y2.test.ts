import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum/build"
import { toAddress, toBigNumber, toWord } from "@rarible/types"
import { createRaribleSdk } from "../../index"

// x2y2 works only on mainnet
describe.skip("x2y2", () => {
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
				type: "X2Y2",
				salt: "143024" as any,
				maker: toAddress("0x4c6a766e27726f084c41e2ba98d6df8e78f8e6e1"),
				make: {
					value: toBigNumber("1"),
					assetType: {
						assetClass: "ERC721",
						contract: toAddress("0x259bf444f0bfe8af20b6097cf8d32a85526b03a4"),
						tokenId: toBigNumber("999"),
					},
				},
				take: {
					assetType: {
						assetClass: "ETH",
					},
					value: toBigNumber("15000000000000000"),
				},
				data: {
					dataType: "X2Y2_DATA",
					orderId: toBigNumber("6987731"),
					isBundle: false,
					isCollectionOffer: false,
					itemHash: toWord("0xfdb620a95e0cc78063cbbc9b6a99648fa293c7faf8ba9416c4faedbecabfcac3"),
					side: 1,
				},
			},
			amount: 1,
			originFees: [{
				account: toAddress("0x0d28e9Bd340e48370475553D21Bd0A95c9a60F92"),
				value: 100,
			}],
		})

		console.log(tx)
	})
})
