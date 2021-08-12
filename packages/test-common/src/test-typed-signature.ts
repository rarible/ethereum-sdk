import { Ethereum, signTypedData } from "@rarible/ethereum-provider"

export async function testTypedSignature(eth: Ethereum) {
	const domain = {
		name: 'Ether Mail',
		version: '1',
		chainId: 17,
		verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
	}
	const types = {
		Person: [
			{ name: 'name', type: 'string' },
			{ name: 'wallet', type: 'address' },
		],
		Mail: [
			{ name: 'from', type: 'Person' },
			{ name: 'to', type: 'Person' },
			{ name: 'contents', type: 'string' },
		],
		EIP712Domain: [
			{ type: "string", name: "name" },
			{ type: "string", name: "version" },
			{ type: "uint256", name: "chainId" },
			{ type: "address", name: "verifyingContract" },
		],
	}
	const message = {
		from: {
			name: 'Cow',
			wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
		},
		to: {
			name: 'Bob',
			wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
		},
		contents: 'Hello, Bob!',
	}
	const data = {
		primaryType: "Mail",
		domain,
		types,
		message,
	}
	const signature = await signTypedData(eth, data)
	expect(signature).toBe("0xcdb06d43817c98f1aefb9e3ecdfc45c35a07795b89f15930913e9150442b157f7fb5b37ae49e3c8674857660c16f7512f140ed4594e6d426f4db5fae57701d491b")
}
