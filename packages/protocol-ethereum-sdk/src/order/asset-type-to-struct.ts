import { AssetType } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"

export function assetTypeToStruct(ethereum: Ethereum, assetType: AssetType) {
	switch (assetType.assetClass) {
		case "ETH":
			return {
				assetClass: ETH,
				data: "0x",
			}
		case "ERC20":
			return {
				assetClass: ERC20,
				data: ethereum.encodeParameter("address", assetType.contract),
			}
		case "ERC721":
			return {
				assetClass: ERC721,
				data: ethereum.encodeParameter(
					{ root: CONTRACT_TOKEN_ID },
					{ contract: assetType.contract, tokenId: assetType.tokenId }
				),
			}
		case "ERC1155":
			return {
				assetClass: ERC1155,
				data: ethereum.encodeParameter(
					{ root: CONTRACT_TOKEN_ID },
					{ contract: assetType.contract, tokenId: assetType.tokenId }
				),
			}
		case "ERC721_LAZY": {
			const encoded = ethereum.encodeParameter(ERC721_LAZY_TYPE, {
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
			const encoded = ethereum.encodeParameter(ERC1155_LAZY_TYPE, {
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
		default: {
			throw new Error(`Unsupported asset class: ${assetType.assetClass}`)
		}
	}
}

const ETH = "0xaaaebeba" //id("ETH")
const ERC20 = "0x8ae85d84" //id("ERC20")
const ERC721 = "0x73ad2146" //id("ERC721")
const ERC1155 = "0x973bb640" //id("ERC1155")
const ERC721_LAZY = "0xd8f960c1" //id("ERC721_LAZY")
const ERC1155_LAZY = "0x1cdfaa40" //id("ERC1155_LAZY")

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
