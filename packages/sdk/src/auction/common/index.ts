import { keccak256 } from "ethereumjs-util"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumber } from "@rarible/types"
import type { AssetType } from "@rarible/ethereum-api-client"
import type { BigNumberValue} from "@rarible/utils/build/bn"
import { toBn } from "@rarible/utils/build/bn"
import { id } from "../../common/id"
import type { EthereumConfig } from "../../config/type"
import { createErc20Contract } from "../../order/contracts/erc20"

export const AUCTION_DATA_TYPE = id("V1")

export function getAuctionOperationOptions(buyAssetType: AssetType, value: BigNumber) {
	if (buyAssetType.assetClass === "ETH") {
		return {value}
	}
	return {}
}

export async function getPrice(
	ethereum: Ethereum, assetType: AssetType, priceDecimal: BigNumberValue
): Promise<BigNumberValue> {
	switch (assetType.assetClass) {
		case "ETH":
			return toBn(priceDecimal).multipliedBy(toBn(10).pow(18))
		case "ERC20":
			const decimals = await createErc20Contract(ethereum, assetType.contract)
				.functionCall("decimals")
				.call()
			return toBn(priceDecimal).multipliedBy(toBn(10).pow(Number(decimals)))
		default:
			throw new Error(`Asset type should be either ETH or ERC-20, received=${JSON.stringify(assetType)}`)
	}
}

export function getAuctionHash(
	ethereum: Ethereum,
	config: EthereumConfig,
	auctionId: BigNumber,
): string {
	const hash = ethereum.encodeParameter(AUCTION_HASH_TYPE, {
		contractAddress: config.auction,
		auctionId: auctionId,
	})
	return `0x${keccak256(Buffer.from(hash.substring(2), "hex")).toString("hex")}`
}

export const AUCTION_HASH_TYPE = {
	components: [
		{
			name: "contractAddress",
			type: "address",
		},
		{
			name: "auctionId",
			type: "uint256",
		},
	],
	name: "data",
	type: "tuple",
}

export const AUCTION_BID_DATA_V1 = {
	components: [
		{
			components: [
				{
					name: "account",
					type: "address",
				},
				{
					name: "value",
					type: "uint96",
				},
			],
			name: "payouts",
			type: "tuple[]",
		},
		{
			components: [
				{
					name: "account",
					type: "address",
				},
				{
					name: "value",
					type: "uint96",
				},
			],
			name: "originFees",
			type: "tuple[]",
		},
	],
	name: "data",
	type: "tuple",
}
