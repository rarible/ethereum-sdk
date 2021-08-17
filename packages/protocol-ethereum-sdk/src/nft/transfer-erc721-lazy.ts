import { Address, NftItemControllerApi, NftOwnershipControllerApi } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { createErc721LazyContract } from "./contracts/erc721/erc721-lazy"

export async function transferErc721Lazy(
	ethereum: Ethereum,
	nftOwnershipApi: NftOwnershipControllerApi,
	nftItemApi: NftItemControllerApi,
	contract: Address,
	from: Address,
	to: Address,
	tokenId: string,
): Promise<string | undefined> {
	const erc721Lazy = createErc721LazyContract(ethereum, contract)
	const ownership = await nftOwnershipApi.getNftOwnershipsByItem({ tokenId, contract })
	if (ownership.total) {
		const lazyValue = ownership.ownerships.find(o => o.owner === from)?.lazyValue
		if (lazyValue) {
			const nftItem = await nftItemApi.getNftItemByIdRaw({ itemId: tokenId })
			if (nftItem.status === 200) {
				const params = [
					{
						tokenId: nftItem.value.tokenId,
						uri: nftItem.value,
						creators: nftItem.value.creators,
						royalties: nftItem.value.royalties,
						// signatures,
					},
					from,
					to,
				]
				const tx = await erc721Lazy.functionCall("transferFromOrMint", ...params).send()
				return tx.hash
			}
		} else if (lazyValue === undefined) {
			throw new Error(`Can't mint and transfer, lazyValue is ${lazyValue}`)
		} else {
			throw new Error(`Address ${from} has not any ownerships of token with Id ${tokenId}`)
		}
	} else {
		throw new Error(`Address ${from} has not any ownerships of token with Id ${tokenId}`)
	}
	console.log('ownership', ownership)
	return undefined
}
