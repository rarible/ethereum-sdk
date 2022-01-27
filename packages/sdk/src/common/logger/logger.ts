import axios from "axios"
import { RemoteLogger } from "@rarible/logger/build"
import type { Maybe } from "@rarible/types/build/maybe"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { EthereumNetwork } from "../../types"

type Environment = "prod" | "e2e" | "dev" | "staging"

/**
 * Convert network name to stage environment name
 *
 * @param network
 */
export function getEnvironment(network: EthereumNetwork): Environment {
	switch (network) {
		case "mainnet":
		case "polygon":
			return "prod"
		case "mumbai-dev":
			return "dev"
		case "ropsten":
		case "mumbai":
		case "rinkeby":
			return "staging"
		case "e2e":
		default:
			return "e2e"
	}
}

const loggerConfig = {
	service: "ethereum-sdk",
	elkUrl: "https://logging.rarible.com/",
}

export function createRemoteLogger(context: {
	ethereum: Maybe<Ethereum>,
	env: Environment,
}): RemoteLogger {
	const getContext = async () => {
		return {
			service: loggerConfig.service,
			environment: context.env,
			"web3Address": (await context.ethereum?.getFrom()) ?? "unknown",
			"ethNetwork": (await context.ethereum?.getChainId())?.toString() ?? "unknown",
		}
	}

	return new RemoteLogger((msg) => axios.post(loggerConfig.elkUrl, msg), {
		initialContext: getContext(),
	})
}
