import { hexifyOptionsValue } from "./hexify-options-value"

describe("hexify options value", () => {
	test("string value", async () => {
		const { value } = hexifyOptionsValue({ value: "160"})
		expect(value).toBe("0xa0")
	})

	test("number value", async () => {
		const { value } = hexifyOptionsValue({ value: 160})
		expect(value).toBe("0xa0")
	})
})
