import {createE2eProvider} from "../test/create-e2e-provider";
import fetch from "node-fetch";
import {Contract} from "web3-eth-contract";
import {deployTestErc721} from "../order/contracts/test/test-erc721";
import {toAddress} from "@rarible/types";
import {createRaribleSdk} from "../index";
import {toBigNumber} from "@rarible/types/build/big-number";

describe('mint-lazy test', () => {
    const { web3, wallet } = createE2eProvider()
    let testErc721: Contract
    const sdk = createRaribleSdk(web3, "e2e", { fetchApi: fetch })
    beforeAll(async () => {
        testErc721 = await deployTestErc721(web3, "TST", "TST")
    })
    test('should mint erc721_lazy', async () => {
        const nftItem = await sdk.nft.mintLazy(
            {
                "@type": "ERC721",
                contract: toAddress(testErc721.options.address),
                uri: 'ipfs://someUri',
                creators: [{account: toAddress(wallet.getAddressString()), value: 10000}],
                royalties: []
            })
        const resultNft =  await sdk.apis.nftItem.getNftItemById({itemId: nftItem.id})
        expect(resultNft.lazySupply).toEqual('1')
    }, 100000)

    test('should mint erc1155_lazy', async () => {
        const nftItem = await sdk.nft.mintLazy(
            {
                "@type": "ERC1155",
                contract: toAddress(testErc721.options.address),
                uri: 'ipfs://someUri',
                creators: [{account: toAddress(wallet.getAddressString()), value: 10000}],
                royalties: [],
                supply: toBigNumber('100')
            })
        const resultNft =  await sdk.apis.nftItem.getNftItemById({itemId: nftItem.id})
        expect(resultNft.lazySupply).toEqual('100')
    }, 100000)
})
