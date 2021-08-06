export const EIP721_NFT_TYPE = 'Mint721'
export const EIP721_NFT_DOMAIN = [
	{ type: "string", name: "name" },
	{ type: "string", name: "version" },
	{ type: "uint256", name: "chainId" },
	{ type: "address", name: "verifyingContract" },
]
export const EIP721_NFT_TYPES = {
	EIP712Domain: EIP721_NFT_DOMAIN,
	Part: [
		{ name: 'account', type: 'address' },
		{ name: 'value', type: 'uint96' },
	],
	Mint721: [
		{ name: 'tokenId', type: 'uint256' },
		{ name: 'tokenURI', type: 'string' },
		{ name: 'creators', type: 'Part[]' },
		{ name: 'royalties', type: 'Part[]' },
	],
}

export const EIP721_DOMAIN_NFT_NAME = "Mint721"
export const EIP721_DOMAIN_NFT_VERSION = "1"
export const EIP721_DOMAIN_NFT_TEMPLATE = {
	name: EIP721_DOMAIN_NFT_NAME,
	version: EIP721_DOMAIN_NFT_VERSION,
}
