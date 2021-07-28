import {Address, Asset} from "@rarible/protocol-api-client";
import {
    getErc1155LazyMintTransferProxy,
    getErc20TransferProxyAddress,
    getErc721LazyMintTransferProxy,
    getTransferProxyAddress
} from "../order/addresses";

export function getProxyAddressByAssetType(chainId: number, asset: Asset): Address | null {
    switch (asset.assetType.assetClass) {
        case "ERC20": {
            return getErc20TransferProxyAddress(chainId)
        }
        case "ERC721": {
            return  getTransferProxyAddress(chainId)
        }
        case "ERC1155": {
            return getTransferProxyAddress(chainId)
        }
        case "ERC721_LAZY":
            return getErc721LazyMintTransferProxy(chainId)
        case "ERC1155_LAZY": {
            return getErc1155LazyMintTransferProxy(chainId)
        }
        default: {
            throw Error('invalid assetClass')
            return null
        }
    }
}
