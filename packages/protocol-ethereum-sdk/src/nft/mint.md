```typescript

function showHowToMint(nftCollection: NftCollection) {
	if (nftCollection.type === "ERC721") {
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
		return mint({
			collection,
			uri: "uri",
			creators: [],
		})
	}
	if (nftCollection.type === "ERC1155") {
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
		return mint({
			collection,
			uri: "",
			royalties: [],
			supply: 10
		})
	}
	throw new Error("Unknown collection type")
}
```
