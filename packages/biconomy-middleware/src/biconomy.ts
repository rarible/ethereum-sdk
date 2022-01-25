import { providerAsMiddleware, providerFromEngine } from "eth-json-rpc-middleware"
import { JsonRpcEngine } from "json-rpc-engine"
import type { SafeEventEmitterProvider } from "eth-json-rpc-middleware/dist/utils/cache"
import { biconomyMiddleware } from "./middleware"
import type { IBiconomyConfig, IContractRegistry } from "./types"

/**
 * Apply biconomy middleware to provider
 * @param provider web3 provider
 * @param registry contracts registry
 * @param config config for biconomy provider instance
 */
export function withBiconomyMiddleware(
	provider: any,
	registry: IContractRegistry,
	config: IBiconomyConfig
): SafeEventEmitterProvider {
	const engine = new JsonRpcEngine()
	engine.push(biconomyMiddleware(provider, registry, config))
	engine.push(providerAsMiddleware(provider as any))
	return providerFromEngine(engine)
}
