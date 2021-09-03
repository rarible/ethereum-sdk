import { Configuration, GatewayControllerApi, NftCollectionControllerApi } from "@rarible/protocol-api-client"
import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import { EthereumContract } from "@rarible/ethereum-provider"
import { toAddress } from "@rarible/types/build/address"
import { toBinary, toWord } from "@rarible/types"
import { getTokenId as getTokenIdTemplate } from "../nft/get-token-id"
import { createMintableTokenContract } from "../nft/contracts/erc721/mintable-token"
import { send as sendTemplate } from "./send-transaction"

describe("sendTransaction", () => {
	const { provider, wallet } = createE2eProvider()
	const web3 = new Web3(provider)
	const ethereum = new Web3Ethereum({ web3 })
	const configuration = new Configuration({ basePath: "https://ethereum-api-e2e.rarible.org" })
	const gatewayApi = new GatewayControllerApi(configuration)
	const collectionApi = new NftCollectionControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const getTokenId = getTokenIdTemplate.bind(null, collectionApi)

	let testErc721: EthereumContract
	const collectionId = toAddress("0x87ECcc03BaBC550c919Ad61187Ab597E9E7f7C21")
	beforeAll(async () => {
		testErc721 = await createMintableTokenContract(ethereum, collectionId)
	})

	test("should send transaction and create pending logs", async () => {
		const minter = toAddress(wallet.getAddressString())
		const { tokenId, signature: { v, r, s } } = await getTokenId(collectionId, minter)
		const functionCall = testErc721.functionCall("mint", tokenId, v, r, s, [], "uri")
		const tx = await send(functionCall)
		const createTransactionRequest = {
			hash: toWord(tx.hash),
			from: toAddress(tx.from),
			to: tx.to ? toAddress(tx.to) : undefined,
			input: toBinary(tx.data),
		}
		// @ts-ignore //todo remove ts-ignore when updates protocol-api-client without nonce param
		const logs = await gatewayApi.createGatewayPendingTransactions({ createTransactionRequest })
		expect(logs).toBeTruthy()
		expect(tx.from.toLowerCase()).toBe(minter.toLowerCase())
	})
})
