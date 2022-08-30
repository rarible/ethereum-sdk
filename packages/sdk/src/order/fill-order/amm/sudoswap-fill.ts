import type { BigNumber } from "@rarible/types"
import { toBigNumber, ZERO_ADDRESS } from "@rarible/types"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { Erc721AssetType } from "@rarible/ethereum-api-client/build/models/AssetType"
import type { Asset } from "@rarible/ethereum-api-client"
import type { OrderFillSendData } from "../types"
import type { AmmOrderFillRequest } from "../types"
import type { EthereumConfig } from "../../../config/type"
import { createSudoswapRouterV1Contract } from "../../contracts/sudoswap-router-v1"
import { getUpdatedCalldata } from "../common/get-updated-call"
import type { IRaribleEthereumSdkConfig } from "../../../types"


export class SudoswapFill {
	static async getDirectFillData(
		ethereum: Ethereum,
		request: AmmOrderFillRequest,
		config: EthereumConfig,
		sdkConfig?: IRaribleEthereumSdkConfig
	): Promise<OrderFillSendData> {
		const order = request.order
		if (order.data.dataType !== "SUDOSWAP_AMM_DATA_V1") {
			throw new Error("Wrong order data type " + order.data.dataType)
		}

		const { pairRouter } = config.sudoswap
		if (!pairRouter || pairRouter === ZERO_ADDRESS) {
			throw new Error("Sudoswap router contract address has not been set. Change address in config")
		}
		const routerContract = createSudoswapRouterV1Contract(ethereum, pairRouter)
		const tokenType = getTokenAssetType(order.make)
		const nftRecipient = await ethereum.getFrom()

		let functionCall = undefined
		let options = undefined
		switch (order.take.assetType.assetClass) {
			case "ETH":
				functionCall = routerContract.functionCall(
					"swapETHForSpecificNFTs",
					[{
						pair: order.data.contract,
						nftIds: [tokenType.tokenId],
					}],
					order.maker,
					nftRecipient,
					SudoswapFill.getDeadline()
				)
				options = {
					value: order.take.value,
				}
				break
			default:
				throw new Error("Unsupported asset type " + order.take.assetType.assetClass)
		}

		return {
			functionCall,
			options: {
				...options,
				additionalData: getUpdatedCalldata(sdkConfig),
			},
		}
	}

	//todo: default deadline?
	static getDeadline(duration: number = 7 * 24 * 60 * 60 ): BigNumber {
		const deadlineTimestamp = Date.now() + duration
		return toBigNumber("0x" + deadlineTimestamp.toString(16).padStart(64, "0"))
	}

}

function getTokenAssetType(asset: Asset): Erc721AssetType {
	if (asset.assetType.assetClass !== "ERC721") {
		throw new Error("Unsupported asset class" + asset.assetType.assetClass)
	}

	return asset.assetType
}
