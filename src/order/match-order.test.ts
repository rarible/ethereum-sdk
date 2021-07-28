import {deployTestErc20} from "./contracts/test/test-erc20";
import {deployTestErc721} from "./contracts/test/test-erc721";
import {deployTransferProxy} from "./contracts/test/test-transfer-proxy";
import {deployErc20TransferProxy} from "./contracts/test/test-erc20-transfer-proxy";
import {deployTestExchangeV2} from "./contracts/test/test-exchange-v2";
import {deployTestRoyaltiesProvider} from "./contracts/test/test-royalties-provider";
import {Contract} from "web3-eth-contract";
import {toAddress, toBigNumber} from "@rarible/types";
import {sentTx} from "../common/send-transaction";
import {BN} from "ethereumjs-util";
import {createGanacheProviderTwoWallets} from "../test/create-ganache-provider-two-wallets";
import {BigNumber, OrderForm} from "@rarible/protocol-api-client";
import {matchOrders, OrderMaker} from "./match-order";

describe('match-order', () => {
    const { web3, address } = createGanacheProviderTwoWallets()
    const [sender1Address, sender2Address] = address

    let testErc20: Contract
    let testErc721: Contract
    let transferProxy: Contract
    let erc20TransferProxy: Contract
    let royaltiesProvider: Contract
    let exchangeV2: Contract
    beforeAll(async () => {
        /**
         * Deploy
         */
        testErc20 = await deployTestErc20(web3, "Test1", "TST1")
        testErc721 = await deployTestErc721(web3, "Test", "TST")
        transferProxy = await deployTransferProxy(web3)
        erc20TransferProxy = await deployErc20TransferProxy(web3)
        royaltiesProvider = await deployTestRoyaltiesProvider(web3)
        exchangeV2 = await deployTestExchangeV2(web3)
        /**
         * Configuring
         */
        await sentTx(exchangeV2.methods.__ExchangeV2_init(
            toAddress(transferProxy.options.address),
            toAddress(erc20TransferProxy.options.address),
            toBigNumber('0'),
            sender1Address,
            toAddress(royaltiesProvider.options.address),
        ),{from: sender1Address})
        await sentTx(transferProxy.methods.addOperator(toAddress(exchangeV2.options.address)), {from: sender1Address})
        await sentTx(erc20TransferProxy.methods.addOperator(toAddress(exchangeV2.options.address)), {from: sender1Address})

    })
    test('should match order(buy erc721 for erc20)', async () => {
        const tokenId = sender1Address + "b00000000000000000000001"
        await sentTx(testErc20.methods.mint(sender1Address, 100), { from: sender1Address, gas: 200000 })

        await sentTx(testErc721.methods.mint(sender2Address, tokenId, 'https://example.com'), { from: sender2Address })
        const testOrderLeft: OrderForm = {
            make: {
                assetType: {
                    assetClass: "ERC20",
                    contract: toAddress(testErc20.options.address),
                },
                value: toBigNumber("10"),
            },
            maker: sender1Address,
            take: {
                assetType: {
                    assetClass: "ERC721",
                    contract: toAddress(testErc721.options.address),
                    tokenId: tokenId as BigNumber,
                },
                value: toBigNumber("1"),
            },
            salt: toBigNumber("10"),
            type: 'RARIBLE_V2',
            data: {
                dataType: "RARIBLE_V2_DATA_V1",
                payouts: [],
                originFees: []
            }
        }

        await sentTx(
            testErc20.methods.approve(
                erc20TransferProxy.options.address,
                new BN(10)
            ),
            {from: sender1Address}
        )

        await sentTx(
            testErc20.methods.approve(
                erc20TransferProxy.options.address,
                new BN(10)
            ),
            {from: sender2Address}
        )

        await sentTx(
            testErc721.methods.setApprovalForAll(transferProxy.options.address, true),
            {from: sender1Address}
        )
        await sentTx(
            testErc721.methods.setApprovalForAll(transferProxy.options.address, true),
            {from: sender2Address}
        )

        console.log('sender1 nft', await testErc721.methods.balanceOf(sender1Address).call(), 'sender2 nft', await testErc721.methods.balanceOf(sender2Address).call())
        console.log('sender1 erc20', await web3.eth.getBalance(sender1Address), 'sender1 erc20', await web3.eth.getBalance(sender2Address));
        const maker: OrderMaker = {
            maker: sender2Address,
            amount: toBigNumber('10'),
            payouts: [],
            originFees: []
        }
        console.log('sender1Address', sender1Address)
        console.log('maker', maker)
        const hash = await matchOrders(
            web3,
            sender1Address,
            testOrderLeft,
            maker,
            toAddress(exchangeV2.options.address)
        );
        console.log('sender1 nft', await testErc721.methods.balanceOf(sender1Address).call(), 'sender2 nft', await testErc721.methods.balanceOf(sender2Address).call())
        const receipt = await web3.eth.getTransactionReceipt(hash as string)
        console.log('receipt', receipt)
    })
})
