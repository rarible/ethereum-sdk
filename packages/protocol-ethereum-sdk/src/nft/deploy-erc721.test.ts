import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { toAddress, toWord } from "@rarible/types"
import { Contract } from "web3-eth-contract"
import {
	Configuration, GatewayControllerApi,
} from "@rarible/ethereum-api-client"
import { send as sendTemplate } from "../common/send-transaction"
import { getApiConfig } from "../config/api-config"
import { Config } from "../config/type"
import { E2E_CONFIG } from "../config/e2e"
import {
	deployTestErc721RaribleMinimal,
} from "./contracts/erc721/deploy/rarible-minimal"
import { deployTestUpgradableBeacon } from "./contracts/upgradable-beacon"
import { deployTestErc721RaribleFactory } from "./contracts/erc721/deploy/rarible-factory"
import { DeployErc721 } from "./deploy-erc721"
import { deployTestErc721RaribleUserFactory } from "./contracts/erc721/deploy/rarible-user-factory"
import {
	deployTestErc721RaribleUserMinimal,
} from "./contracts/erc721/deploy/rarible-user-minimal"

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
	const deployErc721 = new DeployErc721(ethereum1, send, config)

	const it = awaitAll({
		raribleMinimalErc721: deployTestErc721RaribleMinimal(web3),
		raribleUserMinimalErc721: deployTestErc721RaribleUserMinimal(web3),
	})

	let raribleFactory: Contract
	let raribleUserFactory: Contract

	beforeAll(async () => {
		const beacon = await deployTestUpgradableBeacon(web3, toAddress(it.raribleMinimalErc721.options.address))
		raribleFactory = await deployTestErc721RaribleFactory(web3, toAddress(beacon.options.address))

		config.factories.erc721 = toAddress(raribleFactory.options.address)

		//Deploy user factory
		const userBeacon = await deployTestUpgradableBeacon(web3, toAddress(it.raribleUserMinimalErc721.options.address))
		raribleUserFactory = await deployTestErc721RaribleUserFactory(web3, toAddress(userBeacon.options.address))

		config.factories.erc721User = toAddress(raribleUserFactory.options.address)
	})

	test("should calculate correct contract address", async () => {
		const tokenContractAddress1 = await raribleFactory.methods.getAddress(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			3
		).call()

		const tokenContractAddress2 = await deployErc721.getContractAddress(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			toWord("0x0000000000000000000000000000000000000000000000000000000000000003")
		)

		expect(tokenContractAddress2.toLowerCase()).toBe(tokenContractAddress1.toLowerCase())
	})

	test("should deploy erc721 token and mint", async () => {
		const deployedToken = await deployErc721.deployToken(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			toWord("0x0000000000000000000000000000000000000000000000000000000000000003")
		)
		const receipt = await deployedToken.wait()
		const createProxyEvent = receipt.events.find(e => e.event === "Create721RaribleProxy")

		if (!createProxyEvent || !createProxyEvent.args) {
			throw new Error("Proxy has not been created")
		}

		const proxy = createProxyEvent.args.proxy

		const calculatedTokenContractAddress = await raribleFactory.methods.getAddress(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			toWord("0x0000000000000000000000000000000000000000000000000000000000000003")
		).call()

		expect(calculatedTokenContractAddress.toLowerCase()).toBe(proxy.toLowerCase())
	})


	test("should calculate correct user contract address", async () => {
		const tokenContractAddress1 = await raribleUserFactory.methods.getAddress(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			[],
			3
		).call()

		const tokenContractAddress2 = await deployErc721.getUserContractAddress(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			[],
			toWord("0x0000000000000000000000000000000000000000000000000000000000000003")
		)

		expect(tokenContractAddress2.toLowerCase()).toBe(tokenContractAddress1.toLowerCase())
	})

	test("should deploy erc721 user token and mint", async () => {
		const deployedToken = await deployErc721.deployUserToken(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			[],
			toWord("0x0000000000000000000000000000000000000000000000000000000000000003")
		)
		const receipt = await deployedToken.wait()
		const createProxyEvent = receipt.events.find(e => e.event === "Create721RaribleUserProxy")

		if (!createProxyEvent || !createProxyEvent.args) {
			throw new Error("Proxy has not been created")
		}

		const proxy = createProxyEvent.args.proxy

		const calculatedContractAddress = await raribleUserFactory.methods.getAddress(
			"name",
			"RARI",
			"https://ipfs.rarible.com",
			"https://ipfs.rarible.com",
			[],
			toWord("0x0000000000000000000000000000000000000000000000000000000000000003")
		).call()

		expect(calculatedContractAddress.toLowerCase()).toBe(proxy.toLowerCase())
	})
})
