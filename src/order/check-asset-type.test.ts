import fetch from "node-fetch"
import { toAddress, toBigNumber } from "@rarible/types"
import {createRaribleSdk} from "../index";
import {createE2eProvider} from "../test/create-e2e-provider";
import {deployTestErc721} from "./contracts/test/test-erc721";
import {deployTestErc20} from "./contracts/test/test-erc20";
import {Contract} from "web3-eth-contract";


describe("check-asset-type test", function() {
    const { web3, wallet } = createE2eProvider()
    const sdk = createRaribleSdk(web3, "e2e", { fetchApi: fetch })
    let testErc20: Contract
    let testErc721: Contract
    beforeAll(async () => {
        testErc20 = await deployTestErc20(web3, "Test", "Test")
        testErc721 = await deployTestErc721(web3, "TST", "TST")
    })
    test("should set assetClass if type not present", async () => {

        await testErc721.methods.mint(wallet.getAddressString(), "1", "").send({ from: wallet.getAddressString(), gas: 200000 })
        const order = await sdk.order.sell({
            makeAssetType: {
                contract: toAddress(testErc721.options.address),
                tokenId: toBigNumber("1"),
            },
            amount: 1,
            maker: toAddress(wallet.getAddressString()),
            originFees: [],
            payouts: [],
            price: '10',
            takeAssetType: { assetClass: "ERC20", contract: toAddress(testErc20.options.address) },
            // takeAssetType: { assetClass: "ERC20", contract: toAddress(testErc20.options.address) },
        }).then(a => a.runAll())

        const orderFromApi = await sdk.apis.order.getOrderByHash({hash: order.hash})
        expect(orderFromApi.maker).toEqual(wallet.getAddressString())
        const collection = await sdk.apis.nftCollection.getNftCollectionById({collection: testErc721.options.address})
        expect(collection.type).toEqual("ERC721")
    }, 50000)

    test("should leave as is if assetClass present", async () => {

        await testErc721.methods.mint(wallet.getAddressString(), "2", "").send({ from: wallet.getAddressString(), gas: 200000 })
        const order = await sdk.order.sell({
            makeAssetType: {
                assetClass: 'ERC721',
                contract: toAddress(testErc721.options.address),
                tokenId: toBigNumber("2"),
            },
            amount: 1,
            maker: toAddress(wallet.getAddressString()),
            originFees: [],
            payouts: [],
            price: '10',
            takeAssetType: { assetClass: "ERC20", contract: toAddress(testErc20.options.address) },
        }).then(a => a.runAll())

        const orderFromApi = await sdk.apis.order.getOrderByHash({hash: order.hash})
        expect(orderFromApi.maker).toEqual(wallet.getAddressString())
        const collection = await sdk.apis.nftCollection.getNftCollectionById({collection: testErc721.options.address})
        expect(collection.type).toEqual("ERC721")
    }, 50000)

})
