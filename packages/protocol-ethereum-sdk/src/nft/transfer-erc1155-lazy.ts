import {
	Address,
	Binary,
	Erc1155LazyAssetType,
	NftItemControllerApi,
	NftOwnershipControllerApi,
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { toBn } from "../common/to-bn"
import { SimpleLazyNft } from "./sign-nft"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"

export async function transferErc1155Lazy(
	ethereum: Ethereum,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	asset: Omit<Erc1155LazyAssetType, "signatures" | "uri" | "supply">,
	to: Address,
	amount: BigNumber,
): Promise<string | undefined> {
	const nftItem = await nftItemApi.getNftLazyItemById({ itemId: asset.tokenId })
	const ownership = await nftOwnershipApi.getNftOwnershipsByItem({
		tokenId: nftItem.tokenId,
		contract: nftItem.contract,
	})
	const minter = await ethereum.getFrom()
	const ownedByMinter = ownership.ownerships.find(o => o.owner.toLowerCase() === minter.toLowerCase())
	if (ownedByMinter) {
		const lazyMintNftData: SimpleLazyNft<"signatures"> = {
			"@type": "ERC1155",
			contract: nftItem.contract,
			tokenId: nftItem.tokenId,
			uri: nftItem.uri,
			creators: nftItem.creators,
			royalties: nftItem.royalties,
			supply: amount,
		}
		const signature = await signNft(lazyMintNftData)
		const params = {
			tokenId: lazyMintNftData.tokenId,
			uri: lazyMintNftData.uri,
			creators: lazyMintNftData.creators,
			royalties: lazyMintNftData.royalties,
			supply: amount,
			signatures: [signature],
		}
		const erc1155Lazy = createErc1155LazyContract(ethereum, nftItem.contract)
		if (toBn(ownedByMinter.value).gte(amount)) {
			const tx = await erc1155Lazy.functionCall("mintAndTransfer", params, to, amount).send()
			return tx.hash
		} else if (toBn(ownedByMinter.value).plus(ownedByMinter.lazyValue).gte(amount)) {
			const tx = await erc1155Lazy.functionCall("transferFromOrMint", params, minter, to, amount).send()
			return tx.hash
		} else {
			throw new Error(`Account ${minter} don't have enough token supply for transfer`)
		}
	} else {
		throw new Error(`Address ${minter} has not any ownerships of token with Id ${nftItem.tokenId}`)
	}
}
