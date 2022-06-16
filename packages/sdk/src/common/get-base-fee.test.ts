import { getEthereumConfig } from "../config"
import { getBaseFee } from "./get-base-fee"

describe("get base fee", () => {
	const config = getEthereumConfig("testnet")

	test("get base fee from mainnet", async () => {
	  const fee = await getBaseFee(config, "mainnet")
		expect(fee).not.toBeNaN()
	})

	test("check fees.json config", async () => {
		const configFile = require("../config/fees.json")
		expect(configFile).toBeTruthy()
	})
})
