import { Address, BigNumber } from "@rarible/protocol-api-client"

export function getOwnershipId(contract: Address, tokenId: BigNumber, owner: Address): string {
	return `${contract}:${tokenId}:${owner}`
}
