import { NftCollectionControllerApi } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { Address } from "@rarible/types"
import { mintErc721 } from "./mint-erc721"
import { mintErc1155 } from "./mint-erc1155"
import { createErc721Contract } from "../order/contracts/erc721"
import { createErc1155Contract } from "../order/contracts/erc1155"

type MintErc721Data = {
	assetClass: "ERC721",
	contract: Address,
	minter: Address,
	to: Address,
	uri: string,
}

type MintErc1155Data = {
	assetClass: "ERC1155",
	contract: Address,
	minter: Address,
	to: Address,
	uri: string,
	amount: number
}

type MintDataType = MintErc721Data | MintErc1155Data

export async function mint(
	ethereum: Ethereum,
	nftCollectionApi: NftCollectionControllerApi,
	data: MintDataType,
): Promise<string | undefined> {
	switch (data.assetClass) {
		case "ERC721": {
			const erc721Contract = createErc721Contract(ethereum, data.contract)
			const { tokenId } = await nftCollectionApi.generateNftTokenId({ collection: data.contract, minter: data.minter })
			return await mintErc721(ethereum, erc721Contract, data.minter, data.to, data.uri, tokenId)
		}
		case "ERC1155": {
			const erc155Contract = createErc1155Contract(ethereum, data.contract)
			const { tokenId } = await nftCollectionApi.generateNftTokenId({ collection: data.contract, minter: data.minter })
			return await mintErc1155(ethereum, erc155Contract, data.minter, data.to, data.uri, tokenId, data.amount)
		}
	}
}

