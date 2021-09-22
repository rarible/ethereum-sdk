## Rarible protocol ethereum Software Development Kit

Rarible protocol-ethereum-sdk enables applications to easily interact with Rarible protocol.

### Installation

```angular2html
npm install -D @rarible/protocol-ethereum-sdk
```

### With protocol-ethereum-sdk, you can:

- Create sell orders
- Create/accept bid for auctions
- Buy tokens for regular sell orders
- Create Lazy Mint NFT ERC721 and ERC1155 tokens
- Make regular mint
- Transfer tokens
- Burn tokens

### Usage

Below examples show how you can implement supported functions in you app.

#### Configure and create Rarible SDK object

```typescript
import { createRaribleSdk } from "@rarible/protocol-ethereum-sdk"

const sdk = createRaribleSdk(web3, env, { fetchApi: fetch })
```

- web3 - configured with your provider [web3js](https://github.com/ChainSafe/web3.js/tree/v1.4.0) client
- env - environment configuration name, it should accept one of these values
  ``` 'ropsten' | 'rinkeby' | 'mainnet' | 'e2e'```

#### Create sell order

```typescript
const order: Order = await sdk.order.sell(request).then(a => a.runAll())
// Sell request example:
const contractErc20Address: Address = '0x0' // your ERC20 contract address
const contractErc721Address: Address = '0x0' // your ERC721 contract address
const tokenId: BigNumber = '0x0' // the ERC721 Id of the token on which we want to place a bid
const sellerAddress: Address = '0x0' // Owner of ERC721 token
const nftAmount: number = 1 // For ERC721 always be 1
const sellPrice: number = 10 // price per unit of ERC721 or ERC1155 token(s)
const request = {
	makeAssetType: {
		assetClass: "ERC1155",
		contract: contractErc721Address,
		tokenId: tokenId,
	},
	maker: sellerAddress,
	amount: nftAmount,
	originFees: [],
	payouts: [],
	price: sellPrice,
	takeAssetType: {
		assetClass: "ERC20",
		contract: contractErc20Address
	},
}
```

Returns an object of created order.

[Sell e2e test](https://github.com/rariblecom/protocol-e2e-tests/blob/master/packages/tests-current/src/erc721-sale.test.ts)

#### Create bid

```typescript

const order: Order = await sdk.order.bid(request).then(a => a.runAll())

// Bid request example:
const contractErc20Address: Address = '0x0' // your ERC20 contract address
const contractErc721Address: Address = '0x0' // your ERC721 contract address
const tokenId: BigNumber = '0x0' // the ERC721 Id of the token on which we want to place a bid
const sellerAddress: Address = '0x0' // Owner of ERC721 token
const buyerAddress: Address = '0x0' // Who make a bid
const nftAmount: number = 1 // For ERC721 always be 1
const bidPrice: number = 10 // price per unit of ERC721 or ERC1155 token(s)

const request = {
	makeAssetType: {
		assetClass: "ERC20",
		contract: contractErc20Address,
	},
	maker: buyerAddress,
	takeAssetType: {
		assetClass: "ERC721",
		contract: contractErc721Address,
		tokenId: tokenId,
	},
	taker: sellerAddress,
	amount: nftAmount,
	originFees: [],
	payouts: [],
	price: bidPrice,
}
```

Returns an object of created bid order.

[Bid e2e test](https://github.com/rariblecom/protocol-e2e-tests/blob/master/packages/tests-current/src/create-bid.test.ts)

#### Purchase order or accept bid (fill order)

```typescript

const order: SimpleOrder

sdk.order.fill(
	order,
	{ payouts: [], originFees: [], amount: 1, infinite: true }
).then(a => a.runAll())
```

For example, you can get the `order` object using our sdk api methods `sdk.apis.order.getSellOrders({})` and pass it
to `fill` function. You can get more information in the test
repository [sell e2e test](https://github.com/rariblecom/protocol-e2e-tests/blob/master/packages/tests-current/src/erc721-sale.test.ts)

#### Mint NFT Tokens

There are support two ways of minting ERC721 and ERC1155 tokens:

1. Regular "on chain" minting using contract.
2. Off chain minting (the transaction itself and payment for gas occurs at the time of purchase or transfer)

### Mint examples

Mint function always return tokenId as string.

```typescript
type MintForm = {
	id: string,               // The contract identifier adress
	type: NftCollection_Type, // NFT type to mint, `ERC721` || `ERC1155`
	isLazySupported: boolean, // The contract supports of lazy minting
	isLazy: boolean,          // The contract is lazy or mint onchain
	loading: boolean          //
}

...

const Dashboard: React.FC<DashboardProps> = ({ provider, sdk, accounts }) => {
	const [collection, setCollection] = useState<MintForm>(mintFormInitial)

  ...

	const mint = async () => {
		let tokenId: string
		const nftCollection = await sdk.apis.nftCollection.getNftCollectionById({ collection: collection.id })
		if (isLazyErc721Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				lazy: collection.isLazy,
			})
			tokenId = resp.tokenId
		} else if (isLazyErc1155Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				supply: toBigNumber('1'),
				lazy: collection.isLazy,
			})
			tokenId = resp.tokenId
		} else if (isLegacyErc721Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
			})
			tokenId = resp.tokenId
		} else if (isLegacyErc1155Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
				supply: 1,
			})
			tokenId = resp.tokenId
		} else {
			tokenId = ""
			console.log("Wrong collection")
		}

		if (tokenId) {
			/**
			 * Get minted nft through SDK
			 */
			if (collection.isLazySupported && !collection.isLazy) {
				await retry(30, async () => { // wait when indexer aggregate an onChain nft
						await getTokenById(tokenId)
					},
				)
			} else {
				await getTokenById(tokenId)
			}
		}
	}
```

#### ERC721 Lazy

```typescript
const resp = await sdk.nft.mint({
	collection: nftCollection,                                     // NFT collection info
	uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",   // URI of the contract
	creators: [{ account: toAddress(accounts[0]), value: 10000 }], // Creator info
	royalties: [],                                                 // The amount of royalties
	lazy: collection.isLazy,                                       // The contract is lazy or mint onchain
})
tokenId = resp.tokenId
```

#### ERC1155 Lazy

```typescript
const resp = await sdk.nft.mint({
	collection: nftCollection,                                     // NFT collection info
	uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",   // URI of the contract
	creators: [{ account: toAddress(accounts[0]), value: 10000 }], // Creator info
	royalties: [],                                                 // The amount of royalties
	supply: toBigNumber('1'),                                      // Supply values in BigNumber format
	lazy: collection.isLazy,                                       // The contract is lazy or mint onchain
})
tokenId = resp.tokenId
```

#### ERC721

```typescript
const resp = await sdk.nft.mint({
	collection: nftCollection,                                   // NFT collection info
	uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp", // URI of the contract
	royalties: [],                                               // The amount of royalties
})
tokenId = resp.tokenId
```

#### ERC1155

```typescript
const resp = await sdk.nft.mint({
	collection: nftCollection,                                   // NFT collection info
	uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp", // URI of the contract
	royalties: [],                                               // The amount of royalties
	supply: 1,                                                   //
})
tokenId = resp.tokenId
```

[Mint e2e test](https://github.com/rariblecom/protocol-e2e-tests/blob/master/packages/tests-current/src/lazy-mint.test.ts)

#### Transfer

```
transfer(asset, to[, amount])

Transfer request params:

asset: {
    tokenId: BigNumber, // - id of token to transfer
    contract: Address, // - address of token contract
    assetClass?: "ERC721" | "ERC1155" // - not required, type of asset
}
to: Address, // - ethereum address of receiver of token
amount: BigNumber // - amount of asset to transfer, used only for ERC1155 assets
```

Example

```typescript
const hash = await sdk.nft.transfer(
	{
		assetClass: "ERC1155",
		contract: toAddress(contractAddress),
		tokenId: toBigNumber(tokenId),
	},
	receiverAddress,
	toAddress('10')
)

```

#### Burn

```typescript
const hash = await sdk.nft.burn({
	contract: contractAddress,
	tokenId: toBigNumber(tokenId),
})
```

### Suggestions

You are welcome to suggest features and report bugs found! You can do it
here: https://github.com/rarible/protocol-issues/issues
