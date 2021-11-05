import { createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress } from "@rarible/types"
import type { Contract } from "web3-eth-contract"
import {
	Configuration, GatewayControllerApi,
} from "@rarible/ethereum-api-client"
import { send as sendTemplate, sentTx } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import type { Config } from "../config/type"
import { E2E_CONFIG } from "../config/e2e"
import { deployTestErc1155RaribleFactory } from "./contracts/erc1155/deploy/rarible-factory"
import { deployTestErc1155UserRaribleFactory } from "./contracts/erc1155/deploy/rarible-user-factory"
import { DeployErc1155 } from "./deploy-erc1155"
import { deployErc1155RaribleMinimal } from "./contracts/erc1155/deploy/rarible-minimal"
import { deployTestUpgradableBeacon } from "./contracts/upgradable-beacon"
import { deployErc1155TransferProxy } from "./contracts/erc1155/deploy/transfer-proxy"
import { deployErc1155LazyMintTransferProxy } from "./contracts/erc1155/deploy/lazy-mint-transfer-proxy"
import { deployErc1155UserMinimal } from "./contracts/erc1155/deploy/rarible-user-minimal"

describe("deploy token test", () => {
	const { addresses, provider } = createGanacheProvider()
	const [sender1Address] = addresses
	const web3 = new Web3(provider as any)
	const ethereum1 = new Web3Ethereum({ web3, from: sender1Address, gas: 1000000 })

	const config: Config = {
		...E2E_CONFIG,
		chainId: 17,
	}
	const configuration = new Configuration(getApiConfig("e2e"))
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const deployErc1155 = new DeployErc1155(ethereum1, send, config)

	let erc1155Factory: Contract
	let erc1155UserFactory: Contract

	beforeAll(async () => {
		const minimal = await deployErc1155RaribleMinimal(web3)
		await sentTx(
			minimal.methods.__ERC1155Rarible_init("FreeMintable", "TST", "ipfs:/", "ipfs:/"),
			{from: sender1Address}
		)

		const beacon = await deployTestUpgradableBeacon(web3, toAddress(minimal.options.address))
		const transferProxy = await deployErc1155TransferProxy(web3)
		const lazyTransferProxy = await deployErc1155LazyMintTransferProxy(web3)

		erc1155Factory = await deployTestErc1155RaribleFactory(
			web3,
			toAddress(beacon.options.address),
			toAddress(transferProxy.options.address),
			toAddress(lazyTransferProxy.options.address),
		)
		config.factories.erc1155 = toAddress(erc1155Factory.options.address)

		const userMinimal = await deployErc1155UserMinimal(web3)
		await sentTx(
			userMinimal.methods.__ERC1155RaribleUser_init("FreeMintable", "TST", "ipfs:/", "ipfs:/", []),
			{from: sender1Address}
		)

		const userBeacon = await deployTestUpgradableBeacon(web3, toAddress(userMinimal.options.address))
		erc1155UserFactory = await deployTestErc1155UserRaribleFactory(web3, toAddress(userBeacon.options.address))
		config.factories.erc1155User = toAddress(erc1155UserFactory.options.address)
	})

	test("should deploy erc1155 token", async () => {
		const {tx, address} = await deployErc1155.deployToken(
			"FreeMintable",
			"TSA",
			"ipfs:/",
			"ipfs:/",
		)

		const receipt = await tx.wait()

		const createProxyEvent = receipt.events.find(e => e.event === "Create1155RaribleProxy")

		if (!createProxyEvent || !createProxyEvent.args) {
			throw new Error("Proxy has not been created")
		}

		const proxy = createProxyEvent.args.proxy

		expect(proxy.toLowerCase()).toBe(address.toLowerCase())
	})

	test("should deploy user erc1155 token", async () => {
		const {tx, address} = await deployErc1155.deployUserToken(
			"FreeMintable",
			"TSA",
			"ipfs:/",
			"ipfs:/",
			[],
		)
		const receipt = await tx.wait()
		const createProxyEvent = receipt.events.find(e => e.event === "Create1155RaribleUserProxy")

		if (!createProxyEvent || !createProxyEvent.args) {
			throw new Error("Proxy has not been created")
		}

		const proxy = createProxyEvent.args.proxy

		expect(address.toLowerCase()).toBe(proxy.toLowerCase())
	})

})
