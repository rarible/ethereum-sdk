import { NetworkError } from "@rarible/logger/build"
import type { BiconomyApiLimitResponse, ILimitsRegistry } from "./types"

const API_URL = "https://api.biconomy.io/api/v1/dapp/checkLimits"

type LimitsRegistryProps = {
	apiId: string // dapp name from biconomy's dashboard
	apiKey: string
}
export class LimitsRegistry implements ILimitsRegistry {
	constructor(private readonly options: LimitsRegistryProps) {}

	async checkLimits(userAddress: string): Promise<BiconomyApiLimitResponse> {
		const response = await fetch(`${API_URL}?userAddress=${userAddress}&apiId=${this.options.apiId}`, {
			headers: new Headers({
				"x-api-key": this.options.apiKey,
			}),
		})
		if (!response.ok) {
			let value
			try {
				value = await response.clone().json()
			} catch (e) {
				value = await response.clone().text()
			}

			throw new NetworkError({
				status: response.status,
				url: response.url,
				value,
				code: "BICONOMY_EXTERNAL_ERR",
			})
		}
		return response.json()
	}
}
