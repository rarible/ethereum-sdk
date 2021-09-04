import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { signNft, SimpleLazyNft } from "./sign-nft"

describe("mint-lazy test", () => {
	const { provider, addresses } = createGanacheProvider(
		"d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469"
	)
	const [address] = addresses
	// @ts-ignore
	const web3 = new Web3(provider)

	test("should sign ERC721 nft", async () => {
		const nftTemplate: SimpleLazyNft<"signatures"> = {
			"@type": "ERC721",
			contract: toAddress("0x2547760120aED692EB19d22A5d9CCfE0f7872fcE"),
			tokenId: toBigNumber("1"),
			uri: "//uri",
			creators: [{ account: address, value: 10000 }],
			royalties: [],
		}
		const signature = await signNft(new Web3Ethereum({ web3 }), await web3.eth.getChainId(), nftTemplate)
		expect(signature).toEqual(
			"0x35ec1f77b70de693408a2a230f63f0fc8f5ed0f73138e244af0d78dc2f69bf757d46d25361668a2ba3730cd282e3649d941de61b118569eac6339ff5db9d31ac1c"
		)
	}, 10000)
})
