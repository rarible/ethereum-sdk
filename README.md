## Rarible protocol ethereum Software Development Kit

Rarible protocol-ethereum-sdk enables applications to easily interact with Rarible protocol.

### Installtion

```angular2html
mpn install -D @rarible/protocol-ethereum-sdk
```
### With protocol-ethereum-sdk, you can:
- Mint NFT ERC721 and ERC1155 tokens
- Create sell orders
- Create/accept bid for auctions
- Buy tokens for regular sell orders
- Transfer tokens
- Burn tokens

### Usage

Below examples show how you can implement supported functions in you app.

#### Configure and create Rarible SDK object
```typescript
import { createRaribleSdk } from "@rarible/protocol-ethereum-sdk"

const sdk = createRaribleSdk(web3, env, { fetchApi: fetch })
```
- web3 - configured [web3js](https://github.com/ChainSafe/web3.js/tree/v1.4.0) client
- env - environment configuration name, it should accept one of these values
``` 'ropsten' | 'rinkeby' | 'mainnet' | 'e2e'```

#### Mint NFT Tokens
```

```
#### Create sell order
```typescript
const order: Order = await sdk.order.sell(request: SellRequest).then(a => a.runAll())
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
[Sell e2e test](https://github.com/rariblecom/protocol-e2e-tests/blob/master/packages/tests-current/src/erc721-sale.test.ts)

#### Create bid
```typescript
const order: Order = await sdk.order.bid(request: BidRequest).then(a => a.runAll())

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
[Bid e2e test](https://github.com/rariblecom/protocol-e2e-tests/blob/master/packages/tests-current/src/create-bid.test.ts)

#### Purchase order
```

```
#### Transfer NFT Tokens
```

```
