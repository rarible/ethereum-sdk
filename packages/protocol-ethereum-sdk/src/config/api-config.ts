import type { ConfigurationParameters } from "@rarible/ethereum-api-client"
import { CONFIGS } from "./index"

export function getApiConfig(
	env: keyof typeof CONFIGS, additional: ConfigurationParameters = {}
): ConfigurationParameters {
	return {
		basePath: CONFIGS[env].basePath,
		...additional,
	}
}
