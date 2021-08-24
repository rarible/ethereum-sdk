```typescript

async function showHowToMint(collection: NftCollection) {

	if (isLazy721Collection(collection)) {
		await mint({
			collection,
			uri: "uri",
			royalties: [],
			creators: [],
			// lazy: true for lazy minting
		})
	} else if (isLegacyErc721Collection(collection)) {
		await mint({
			collection,
			uri: "",
			royalties: [],
		})
	} else if (isLazy1155Collection(collection)) {
		await mint({
			collection,
			uri: "",
			royalties: [],
			supply: toBigNumber("1"),
			creators: [],
			// lazy: true for lazy minting
		})
	} else if (isLegacyErc1155Collection(collection)) {
		await mint({
			collection,
			uri: "",
			royalties: [],
			supply: 1,
		})
	}
}
```
