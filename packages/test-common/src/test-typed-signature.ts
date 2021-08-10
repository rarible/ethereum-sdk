import { Ethereum } from "@rarible/ethereum-provider"

export async function testTypedSignature(eth: Ethereum) {
	const domain = {
		name: 'Ether Mail',
		version: '1',
		chainId: 17,
		verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
	};

	const types = {
		Person: [
			{ name: 'name', type: 'string' },
			{ name: 'wallet', type: 'address' }
		],
		Mail: [
			{ name: 'from', type: 'Person' },
			{ name: 'to', type: 'Person' },
			{ name: 'contents', type: 'string' }
		]
	}

	const message = {
		from: {
			name: 'Cow',
			wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826'
		},
		to: {
			name: 'Bob',
			wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'
		},
		contents: 'Hello, Bob!'
	};

	const signature = await eth.signTypedData("Mail", domain, types, message)
	expect(signature).toBe("0xcdb06d43817c98f1aefb9e3ecdfc45c35a07795b89f15930913e9150442b157f7fb5b37ae49e3c8674857660c16f7512f140ed4594e6d426f4db5fae57701d491b")
}
