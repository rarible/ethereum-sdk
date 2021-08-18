import {
	Address,
	Binary,
	Erc721LazyAssetType,
	NftItemControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"
import { SimpleLazyNft } from "./sign-nft"

export async function transferErc721Lazy(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	asset: Omit<Erc721LazyAssetType, "signatures" | "uri">,
	to: Address,
): Promise<string | undefined> {
	const nftItem = await nftItemApi.getNftLazyItemById({ itemId: asset.tokenId })
	const ownership = await nftOwnershipApi.getNftOwnershipsByItem({
		tokenId: nftItem.tokenId,
		contract: nftItem.contract,
	})
	const from = await ethereum.getFrom()
	if (ownership.total) {
		const lazyValue = ownership.ownerships.find(o => o.owner.toLowerCase() === from.toLowerCase())?.lazyValue
		if (lazyValue) {
			const lazyMintNftData: SimpleLazyNft<"signatures"> = {
				"@type": "ERC721",
				contract: nftItem.contract,
				tokenId: nftItem.tokenId,
				uri: nftItem.uri,
				creators: nftItem.creators,
				royalties: nftItem.royalties,
			}
			const signature = await signNft(lazyMintNftData)
			const params = [
				{
					tokenId: lazyMintNftData.tokenId,
					uri: lazyMintNftData.uri,
					creators: lazyMintNftData.creators,
					royalties: lazyMintNftData.royalties,
					signatures: [signature],
				},
				to,
			]
			const erc721Lazy = createErc721LazyContract(ethereum, nftItem.contract)
			const tx = await erc721Lazy.functionCall("mintAndTransfer", ...params).send()
			return tx.hash
		} else if (lazyValue === undefined) {
			//todo may be use transferFromOrMint for this case
			throw new Error(`Can't mint and transfer, lazyValue is ${lazyValue}`)
		} else {
			throw new Error(`Address ${from} has not any ownerships of token with Id ${nftItem.tokenId}`)
		}
	} else {
		throw new Error(`Address ${from} has not any ownerships of token with Id ${nftItem.tokenId}`)
	}
	return undefined
}
