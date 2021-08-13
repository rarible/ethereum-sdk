import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import fetch from "node-fetch"
import { Contract } from "web3-eth-contract"
import { toAddress } from "@rarible/types"
import { toBigNumber } from "@rarible/types/build/big-number"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { createRaribleSdk } from "../index"
import { deployTestErc721 } from "../order/contracts/test/test-erc721"
import { deployTestErc1155 } from "../order/contracts/test/test-erc1155"

describe('mint-lazy test', () => {
	const { provider, wallet } = createE2eProvider()
	let testErc721: Contract
	let testErc1155: Contract
	const web3 = new Web3(provider)
	const sdk = createRaribleSdk(new Web3Ethereum({ web3 }), "e2e", { fetchApi: fetch })
	beforeAll(async () => {
		testErc721 = await deployTestErc721(web3, "TST", "TST")
		testErc1155 = await deployTestErc1155(web3, "TST")
	})
	test('should mint erc721_lazy', async () => {
		const nftItem = await sdk.nft.mintLazy(
			{
				"@type": "ERC721",
				contract: toAddress(testErc721.options.address),
				uri: '/uri',
				creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
				royalties: [],
			})
		const resultNft = await sdk.apis.nftItem.getNftItemById({ itemId: nftItem.id })
		console.log(resultNft)
		expect(resultNft.lazySupply).toEqual('1')
	}, 10000)

	test('should mint erc1155_lazy', async () => {
		const nftItem = await sdk.nft.mintLazy(
			{
				"@type": "ERC1155",
				contract: toAddress(testErc1155.options.address),
				uri: 'ipfs://someUri',
				creators: [{ account: toAddress(wallet.getAddressString()), value: 10000 }],
				royalties: [],
				supply: toBigNumber('100'),
			})
		const resultNft = await sdk.apis.nftItem.getNftItemById({ itemId: nftItem.id })
		expect(resultNft.lazySupply).toEqual('100')
	}, 10000)


})
