import { NetworkError } from "@rarible/logger/build"
import type { ContractMetadata, IContractRegistry } from "./types"

export class Registry implements IContractRegistry {
	private registryData!: Record<string, ContractMetadata>

	constructor(private readonly registryUrl: string) {
	}

	private async fetchData() {
		const resp = await fetch(this.registryUrl)
		if (!resp.ok) {
			let value
			try {
				value = await resp.clone().json()
			} catch (e) {
				value = await resp.clone().text()
			}

			throw new NetworkError({
				status: resp.status,
				url: resp.url,
				value,
				code: "BICONOMY_EXTERNAL_ERR",
			})
		}
		this.registryData = await resp.json()
	}

	async getMetadata(address: string, data?: string): Promise<ContractMetadata | undefined> {
		if (!this.registryData) {
			await this.fetchData()
		}

		const metadata = this.registryData[address.toLowerCase()]

		if (Array.isArray(metadata?.allowedFunctions)) {
			if (!data || !metadata.allowedFunctions.length) {
				return undefined
			}
			const methodId = normalize(data)
			const allowedFunctions = metadata.allowedFunctions.map(value => normalize(value))
			if (allowedFunctions.includes(methodId)) {
				return metadata
			}
			return undefined
		}

		return metadata
	}
}

function normalize(signature: string): string {
	const normalized = signature.startsWith("0x") ? signature.slice(0, 10) : `0x${signature.slice(0, 8)}`
	return normalized.toLowerCase()
}
