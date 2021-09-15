import { randomAddress, toAddress } from "@rarible/types"
import { awaitAll, createGanacheProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { toBn } from "@rarible/utils/build/bn"
import { Configuration, GatewayControllerApi } from "@rarible/protocol-api-client"
import { Web3Ethereum } from "../../../web3-ethereum"
import { getApiConfig } from "../config/api-config"
import { send as sendTemplate, sentTx } from "../common/send-transaction"
import { approveErc20 as approveErc20Template } from "./approve-erc20"
import { deployTestErc20 } from "./contracts/test/test-erc20"

describe("approveErc20", () => {
	const { provider, addresses } = createGanacheProvider(
		"d519f025ae44644867ee8384890c4a0b8a7b00ef844e8d64c566c0ac971c9469"
	)
	const web3 = new Web3(provider as any)
	const ethereum = new Web3Ethereum({ web3 })
	const [testAddress] = addresses
	const configuration = new Configuration(getApiConfig("e2e"))
	const gatewayApi = new GatewayControllerApi(configuration)
	const send = sendTemplate.bind(null, gatewayApi)
	const approveErc20 = approveErc20Template.bind(null, ethereum, send)

	const it = awaitAll({
		testErc20: deployTestErc20(web3, "TST", "TST"),
	})

	beforeAll(async () => {
		await it.testErc20.methods.mint(testAddress, 100).send({ from: testAddress, gas: 200000 })
	})

	test("should approve exact value if not infinite", async () => {
		const operator = randomAddress()
		await approveErc20(toAddress(it.testErc20.options.address), testAddress, operator, toBn(100), false)

		const result = toBn(await it.testErc20.methods.allowance(testAddress, operator).call())
		expect(result.eq(100)).toBeTruthy()
	})

	test("should approve if value infinite", async () => {
		const infiniteBn = toBn(2).pow(256).minus(1)

		const operator = randomAddress()
		await approveErc20(toAddress(it.testErc20.options.address), testAddress, operator, toBn(infiniteBn), true)

		const result = toBn(await it.testErc20.methods.allowance(testAddress, operator).call())
		expect(result.eq(infiniteBn)).toBeTruthy()
	})

	test("should not approve if already approved", async () => {
		const operator = randomAddress()
		const testBnValue = toBn(200)

		await sentTx(it.testErc20.methods.approve(operator, testBnValue), { from: testAddress })

		const result = await approveErc20(
			toAddress(it.testErc20.options.address),
			testAddress,
			operator,
			toBn(testBnValue),
			false
		)

		expect(result === undefined).toBeTruthy()
	})
})
