import { Address, NftItemControllerApi } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { SendFunction } from "../common/send-transaction"
import { TransferAsset } from "./transfer"
import { getErc721Contract } from "./contracts/erc721"
import { ERC1155VersionEnum, ERC721VersionEnum } from "./contracts/domain"
import { getErc1155Contract } from "./contracts/erc1155"

export async function transferNftLazy(
	ethereum: Ethereum,
	send: SendFunction,
	nftItemApi: NftItemControllerApi,
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
			const erc721Lazy = await getErc721Contract(ethereum, ERC721VersionEnum.ERC721V3, lazyNft.contract)
			const tx = await send(erc721Lazy.functionCall("transferFromOrMint", params, from, to))
			return tx.hash
		}
		case "ERC1155": {
			const erc1155Lazy = await getErc1155Contract(ethereum, ERC1155VersionEnum.ERC1155V2, lazyNft.contract)
			const tx = await send(erc1155Lazy.functionCall("transferFromOrMint", params, from, to, amount))
			return tx.hash
		}
		default: throw new Error("Unexpected")
	}
}
