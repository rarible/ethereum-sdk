import type { Address, NftCollection } from "@rarible/protocol-api-client"
import { ERC1155VersionEnum, ERC721VersionEnum } from "../contracts/domain"

export function createErc721V2Collection(address: Address): NftCollection & { version: ERC721VersionEnum.ERC721V2 } {
	return {
		features: ["SECONDARY_SALE_FEES"],
		id: address,
		name: "Test-collection",
		type: "ERC721",
		supportsLazyMint: false,
		version: ERC721VersionEnum.ERC721V2,
	}
}

export function createErc721V3Collection(address: Address): NftCollection & { version: ERC721VersionEnum.ERC721V3 } {
	return {
		features: ["SECONDARY_SALE_FEES", "MINT_AND_TRANSFER"],
		id: address,
		name: "Test-collection",
		type: "ERC721",
		supportsLazyMint: true,
		version: ERC721VersionEnum.ERC721V3,
	}
}

export function createErc721V1Collection(address: Address): NftCollection & { version: ERC721VersionEnum.ERC721V1 } {
	return {
		features: [],
		id: address,
		name: "Test-collection",
		type: "ERC721",
		supportsLazyMint: false,
		version: ERC721VersionEnum.ERC721V1,
	}
}

export function createErc1155V1Collection(address: Address): NftCollection & { version: ERC1155VersionEnum.ERC1155V1 } {
	return {
		features: ["SECONDARY_SALE_FEES"],
		id: address,
		name: "Test-collection",
		type: "ERC1155",
		supportsLazyMint: false,
		version: ERC1155VersionEnum.ERC1155V1,
	}
}

export function createErc1155V2Collection(address: Address): NftCollection & { version: ERC1155VersionEnum.ERC1155V2 } {
	return {
		features: ["MINT_AND_TRANSFER"],
		id: address,
		name: "Test-collection",
		type: "ERC1155",
		supportsLazyMint: true,
		version: ERC1155VersionEnum.ERC1155V2,
	}
}