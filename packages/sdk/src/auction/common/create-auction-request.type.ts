import type { BigNumber } from "@rarible/types"
import type { Erc20AssetType, EthAssetType, Part } from "@rarible/ethereum-api-client"
import type { BigNumberValue } from "@rarible/utils/build/bn"
import type { AssetTypeRequest } from "../../order/check-asset-type"

export type CreateAuctionRequest = {
	makeAssetType: AssetTypeRequest,
	amount: BigNumber,
	takeAssetType: EthAssetType | Erc20AssetType,
	minimalStepDecimal: BigNumberValue,
	minimalPriceDecimal: BigNumberValue,
	duration: number,
	startTime?: number,
	buyOutPriceDecimal: BigNumberValue,
	payouts: Part[],
	originFees: Part[],
}
