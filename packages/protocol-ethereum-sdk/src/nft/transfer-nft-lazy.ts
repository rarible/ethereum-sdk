import { Address, Binary, NftItemControllerApi, NftOwnershipControllerApi } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { SendFunction } from "../common/send-transaction"
import { SimpleLazyNft } from "./sign-nft"
import { createErc1155LazyContract } from "./contracts/erc1155/erc1155-lazy"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"
import { TransferAsset } from "./transfer"

export async function transferNftLazy(
	ethereum: Ethereum,
	send: SendFunction,
	signNft: (nft: SimpleLazyNft<"signatures">) => Promise<Binary>,
	nftItemApi: NftItemControllerApi,
	nftOwnershipApi: NftOwnershipControllerApi,
	asset: TransferAsset,
	from: Address,
	to: Address,
	amount?: BigNumber
): Promise<string> {
	const lazyNft = await nftItemApi.getNftLazyItemById({ itemId: `${asset.contract}:${asset.tokenId}` })
	const params = {
		tokenId: lazyNft.tokenId,
		uri: lazyNft.uri,
		creators: lazyNft.creators,
		royalties: lazyNft.royalties,
		supply: amount,
		signatures: lazyNft.signatures,
	}
	switch (lazyNft["@type"]) {
		case "ERC721": {
			const erc721Lazy = createErc721LazyContract(ethereum, lazyNft.contract)
			const tx = await send(erc721Lazy.functionCall("transferFromOrMint", params, from, to))
			return tx.hash
		}
		case "ERC1155": {
			const erc1155Lazy = createErc1155LazyContract(ethereum, lazyNft.contract)
			const tx = await send(erc1155Lazy.functionCall("transferFromOrMint", params, from, to, amount))
			return tx.hash
		}
		default: {
			throw new Error("Unexpected")
		}
	}
}
