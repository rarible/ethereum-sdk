```typescript

function showHowToMint(collection: NftCollection) {
	if (isErc721v1Collection(collection)) {
		return mint({
			collection,
			uri: "uri",
			creators: [],
		})
	}
	if (isErc721v2Collection(collection)) {
		return mint({
			collection,
			uri: "uri",
			royalties: [],
			creators: [],
		})
	}
	if (isErc721v3Collection(collection)) {
		return mint({
			collection,
			uri: "uri",
			royalties: [],
			creators: [],
			lazy: true
		})
	} 
	if (isErc1155v1Collection(collection)) {
		return mint({
			collection,
			uri: "",
			royalties: [],
			supply: 10
		})
	} 
	if (isErc1155v2Collection(collection)) {
		return mint({
			collection,
			uri: "",
			royalties: [],
			supply: 1,
			creators: [],
			lazy: true
		})
	}
	throw new Error("Unknown collection type")
}
```
