import type { BiconomyApiLimitResponse, ILimitsRegistry } from "./types"

const API_URL = "https://api.biconomy.io/api/v1/dapp/checkLimits"

type LimitsRegistryProps = {
	apiId: string // dapp name from biconomy's dashboard
	apiKey: string
}
export class LimitsRegistry implements ILimitsRegistry {
	constructor(private readonly options: LimitsRegistryProps) {}

	async checkLimits(userAddress: string): Promise<BiconomyApiLimitResponse> {
		const request = await fetch(`${API_URL}?userAddress=${userAddress}&apiId=${this.options.apiId}`, {
			headers: new Headers({
				"x-api-key": this.options.apiKey,
			}),
		})
		return request.json()
	}
}
