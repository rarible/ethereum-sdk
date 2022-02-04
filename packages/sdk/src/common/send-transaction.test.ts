import { Configuration, GatewayControllerApi, NftCollectionControllerApi } from "@rarible/ethereum-api-client"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import type { EthereumContract } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types"
import { getApiConfig } from "../config/api-config"
import { getTokenId as getTokenIdTemplate } from "../nft/get-token-id"
import { getErc721Contract } from "../nft/contracts/erc721"
import { ERC721VersionEnum } from "../nft/contracts/domain"
import { checkChainId } from "../order/check-chain-id"
import { getEthereumConfig } from "../config"
import { createPendingLogs, getSendWithInjects } from "./send-transaction"

describe("sendTransaction", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const config = getEthereumConfig("e2e")
	const configuration = new Configuration(getApiConfig("e2e"))
	const gatewayApi = new GatewayControllerApi(configuration)
	const collectionApi = new NftCollectionControllerApi(configuration)
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)

	const send = getSendWithInjects().bind(null, gatewayApi, checkWalletChainId)
	const getTokenId = getTokenIdTemplate.bind(null, collectionApi)

	let testErc721: EthereumContract
	const collectionId = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	beforeAll(async () => {
		testErc721 = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V2, collectionId)
	})

	test("should send transaction and create pending logs", async () => {
		const minter = toAddress(wallet.getAddressString())
		const { tokenId, signature: { v, r, s } } = await getTokenId(collectionId, minter)
		const functionCall = testErc721.functionCall("mint", tokenId, v, r, s, [], "uri")
		const tx = await send(functionCall)

		const logs = await createPendingLogs(gatewayApi, tx)
		expect(logs).toBeTruthy()
		expect(tx.from.toLowerCase()).toBe(minter.toLowerCase())
	})

	test("throw error if config.chainId is make a difference with chainId of wallet", async () => {
		const config = getEthereumConfig("rinkeby")
		const configuration = new Configuration(getApiConfig("rinkeby"))
		const gatewayApi = new GatewayControllerApi(configuration)
		const checkWalletChainId = checkChainId.bind(null, ethereum, config)

		const send = getSendWithInjects().bind(null, gatewayApi, checkWalletChainId)

		const minter = toAddress(wallet.getAddressString())
		const { tokenId, signature: { v, r, s } } = await getTokenId(collectionId, minter)
		const functionCall = testErc721.functionCall("mint", tokenId, v, r, s, [], "uri")
		const tx = send(functionCall)

		await expect(tx).rejects.toThrow("Config chainId=4, but wallet chainId=17")
	})
})
