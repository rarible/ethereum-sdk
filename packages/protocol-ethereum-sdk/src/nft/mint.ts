import { NftCollectionControllerApi } from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { Address } from "@rarible/types"
import { mintErc721 } from "./mint-erc721"
import { mintErc1155 } from "./mint-erc1155"

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
			return await mintErc721(ethereum, nftCollectionApi, data.contract, data.minter, data.to, data.uri)
		}
		case "ERC1155": {
			return await mintErc1155(ethereum, nftCollectionApi, data.contract, data.minter, data.to, data.uri, data.amount)
		}
	}
}

