import { AssetType } from "@rarible/protocol-api-client"
import { id } from "../common/id"
import { abi } from "./abi"

export function assetTypeToStruct(assetType: AssetType) {
	switch (assetType.assetClass) {
		case "ETH":
			return {
				assetClass: ETH,
				data: "0x",
			}
		case "ERC20":
			return {
				assetClass: ERC20,
				data: abi.encodeParameter("address", assetType.contract),
			}
		case "ERC721":
			return {
				assetClass: ERC721,
				data: abi.encodeParameter(
					{ root: CONTRACT_TOKEN_ID },
					{ contract: assetType.contract, tokenId: assetType.tokenId }
				),
			}
		case "ERC1155":
			return {
				assetClass: ERC1155,
				data: abi.encodeParameter(
					{ root: CONTRACT_TOKEN_ID },
					{ contract: assetType.contract, tokenId: assetType.tokenId }
				),
			}
		case "ERC721_LAZY": {
			const encoded = abi.encodeParameter(ERC721_LAZY_TYPE, {
				contract: assetType.contract,
				data: {
					tokenId: assetType.tokenId,
					uri: assetType.uri,
					creators: assetType.creators,
					royalties: assetType.royalties,
					signatures: assetType.signatures,
				},
			})
			return {
				assetClass: ERC721_LAZY,
				data: `0x${encoded.substring(66)}`,
			}
		}
		case "ERC1155_LAZY": {
			const encoded = abi.encodeParameter(ERC1155_LAZY_TYPE, {
				contract: assetType.contract,
				data: {
					tokenId: assetType.tokenId,
					uri: assetType.uri,
					supply: assetType.supply,
					creators: assetType.creators,
					royalties: assetType.royalties,
					signatures: assetType.signatures,
				},
			})
			return {
				assetClass: ERC1155_LAZY,
				data: `0x${encoded.substring(66)}`,
			}
		}
	}
	throw new Error(`Unsupported asset class: ${assetType.assetClass}`)
}

const ETH = id("ETH")
const ERC20 = id("ERC20")
const ERC721 = id("ERC721")
const ERC1155 = id("ERC1155")
const ERC721_LAZY = id("ERC721_LAZY")
const ERC1155_LAZY = id("ERC1155_LAZY")

const CONTRACT_TOKEN_ID = {
	contract: "address",
	tokenId: "uint256",
}

const ERC721_LAZY_TYPE = {
	components: [
		{
			name: "contract",
			type: "address",
		},
		{
			components: [
				{
					name: "tokenId",
					type: "uint256",
				},
				{
					name: "uri",
					type: "string",
				},
				{
					components: [
						{
							name: "account",
							type: "address",
						},
						{
							name: "value",
							type: "uint96",
						},
					],
					name: "creators",
					type: "tuple[]",
				},
				{
					components: [
						{
							name: "account",
							type: "address",
						},
						{
							name: "value",
							type: "uint96",
						},
					],
					name: "royalties",
					type: "tuple[]",
				},
				{
					name: "signatures",
					type: "bytes[]",
				},
			],
			name: "data",
			type: "tuple",
		},
	],
	name: "data",
	type: "tuple",
}

const ERC1155_LAZY_TYPE = {
	components: [
		{
			name: "contract",
			type: "address",
		},
		{
			components: [
				{
					name: "tokenId",
					type: "uint256",
				},
				{
					name: "uri",
					type: "string",
				},
				{
					name: "supply",
					type: "uint256",
				},
				{
					components: [
						{
							name: "account",
							type: "address",
						},
						{
							name: "value",
							type: "uint96",
						},
					],
					name: "creators",
					type: "tuple[]",
				},
				{
					components: [
						{
							name: "account",
							type: "address",
						},
						{
							name: "value",
							type: "uint96",
						},
					],
					name: "royalties",
					type: "tuple[]",
				},
				{
					name: "signatures",
					type: "bytes[]",
				},
			],
			name: "data",
			type: "tuple",
		},
	],
	name: "data",
	type: "tuple",
}
