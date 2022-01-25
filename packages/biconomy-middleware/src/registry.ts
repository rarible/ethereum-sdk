import type { ContractMetadata, IContractRegistry } from "./types"

export class Registry implements IContractRegistry {
	private registryData!: Record<string, ContractMetadata>

	constructor(private readonly registryUrl: string) {
	}

	private async fetchData() {
		const resp = await fetch(this.registryUrl)
		this.registryData = await resp.json()
	}

	async getMetadata(address: string): Promise<ContractMetadata | undefined> {
		if (!this.registryData) {
			await this.fetchData()
		}
		return this.registryData[address.toLowerCase()]
	}
}