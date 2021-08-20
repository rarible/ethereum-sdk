## Rarible protocol ethereum Software Development Kit

Rarible protocol-ethereum-sdk enables applications to easily interact with Rarible protocol.

### Installation

```angular2html
mpn install -D @rarible/protocol-ethereum-sdk
```

### With protocol-ethereum-sdk, you can:

- Create Lazy Mint NFT ERC721 and ERC1155 tokens
- Create sell orders
- Create/accept bid for auctions
- Buy tokens for regular sell orders

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

#### Lazy Mint NFT Tokens

Creates lazy mint NFT

```typescript

const item = await sdk.nft.mintLazy({
	"@type": "ERC721", // type of token to mint
	contract: "0x0", // lazy mint contract contract address
	uri: '//testUri', // token URI
	creators: [{ account: "0x0", value: 10000 }], // array of creators object
	royalties: [], // array of royalties
})
```

Return minted item object.

[Sell e2e test](https://github.com/rariblecom/protocol-e2e-tests/blob/master/packages/tests-current/src/lazy-mint.test.ts)

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

### Suggestions

You are welcome to suggest features and report bugs found! You can do it
here: https://github.com/rarible/protocol-issues/issues
