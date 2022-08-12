import type { EthereumFunctionCall } from "@rarible/ethereum-provider"
import { toBinary, ZERO_ADDRESS } from "@rarible/types"
import { FILL_CALLDATA_TAG } from "../../../config/common"
import { getUpdatedCall } from "./get-updated-call"

describe("getUpdatedFunctionCall",  () => {

	test("get updated call without sdkConfig", async () => {
		const functionCall = getUpdatedCall({
			data: "0x",
		} as EthereumFunctionCall)
		expect(functionCall.data).toBe("0x")
	})

	test("get updated call with null-length fillCalldata should be rejected", async () => {
		const promise = async () =>
			getUpdatedCall(
				{data: "0x"} as EthereumFunctionCall,
				{ fillCalldata: toBinary("0x") }
			)
		expect(promise).rejects.toThrow("Fill call data has length = 0, but should be = 48")
	})

	test("get updated call with non-hex fillCalldata should be rejected", async () => {
		const promise = async () =>
			getUpdatedCall(
				{data: "0x"} as EthereumFunctionCall,
				{ fillCalldata: toBinary("heh,hoh,2022") }
			)
		expect(promise).rejects.toThrow("Fill calldata is not a hex value")
	})

	test("get updated call with fillCalldata should returns correct FunctionCall", async () => {
		const functionCall = getUpdatedCall(
			{data: "0x1111"} as EthereumFunctionCall,
			{ fillCalldata: toBinary(`${ZERO_ADDRESS}00000001`) }
		)
		expect(functionCall.data).toBe(`0x1111${ZERO_ADDRESS.slice(2)}00000001${FILL_CALLDATA_TAG}`)
	})

	test("get updated call with fillCalldata without started '0x' should returns correct FunctionCall", async () => {
		const functionCall = getUpdatedCall(
			{data: "0x1111"} as EthereumFunctionCall,
			{ fillCalldata: toBinary(`${ZERO_ADDRESS.slice(2)}00000001`) }
		)
		expect(functionCall.data).toBe(`0x1111${ZERO_ADDRESS.slice(2)}00000001${FILL_CALLDATA_TAG}`)
	})
})
