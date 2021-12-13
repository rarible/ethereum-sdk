import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toBigNumber } from "@rarible/types"
import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common/build/create-ganache-provider"
import type { SimpleLazyNft } from "./sign-nft"
import { signNft } from "./sign-nft"

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
			uri: "ipfs://ipfs/hash",
			creators: [{ account: address, value: 10000 }],
			royalties: [],
		}
		const signature = await signNft(new Web3Ethereum({ web3 }), await web3.eth.getChainId(), nftTemplate)
		expect(signature).toEqual(
			"0xf00568d7564b30239642ba5c81ee7be71e0ca79a64d39dafa2f640e69a3cab2e2ac9ea7df77c23f12af3791d94ce64802c35c79d9553e70f76adda4ca69fd6601c"
		)
	})
})
