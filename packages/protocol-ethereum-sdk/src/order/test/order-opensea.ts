import {Asset, AssetType} from "@rarible/protocol-api-client"
import {toAddress, toBigNumber, toBinary, toWord, ZERO_ADDRESS} from "@rarible/types"
import {toBn} from "@rarible/utils"
import {SimpleOpenSeaV1Order} from "../sign-order"

function getRandomTokenId(): string {
	return Math.floor(Math.random() * 300000000).toString()
}

export function getAssetTypeBlank(assetClass: string): Asset {
	switch (assetClass) {
		case "ETH": {
			return {
				assetType: {
					assetClass: "ETH",
				},
				value: toBigNumber("1"),
			}
		}
		case "ERC20": {
			return {
				assetType: {
					assetClass: "ERC20",
					contract: toAddress(ZERO_ADDRESS),
				},
				value: toBigNumber("1"),
			}
		}
		case "ERC721": {
			return {
				assetType: {
					assetClass: "ERC721",
					contract: toAddress(ZERO_ADDRESS),
					tokenId: toBigNumber(getRandomTokenId()),
				},
				value: toBigNumber("1"),
			}
		}
		case "ERC1155": {
			return {
				assetType: {
					assetClass: "ERC1155",
					contract: toAddress(ZERO_ADDRESS),
					tokenId: toBigNumber(getRandomTokenId()),
				},
				value: toBigNumber("1"),
			}
		}
		default: throw new Error("Unrecognized asset type")
	}
}

export const OPENSEA_ORDER_TEMPLATE: Omit<SimpleOpenSeaV1Order, "make" | "take"> = {
	maker: toAddress(ZERO_ADDRESS),
	salt: toWord("0x000000000000000000000000000000000000000000000000000000000000000a"),
	type: "OPEN_SEA_V1",
	start: 0,
	end: 0,
	data: {
		dataType: "OPEN_SEA_V1_DATA_V1",
		exchange: toAddress(ZERO_ADDRESS),
		makerRelayerFee: toBigNumber("0"),
		takerRelayerFee: toBigNumber("0"),
		makerProtocolFee: toBigNumber("0"),
		takerProtocolFee: toBigNumber("0"),
		feeRecipient: toAddress(ZERO_ADDRESS),
		feeMethod: "SPLIT_FEE",
		side: "SELL",
		saleKind: "FIXED_PRICE",
		howToCall: "CALL",
		callData: toBinary("0x"),
		replacementPattern: toBinary("0x"),
		staticTarget: ZERO_ADDRESS,
		staticExtraData: toBinary("0x"),
		extra: toBigNumber("0"),
	},
}

export type TestAssetClass = "ETH" | "ERC20" | "ERC721" | "ERC1155"
export function getOrderTemplate(makeAsset: TestAssetClass, takeAsset: TestAssetClass, side: "SELL" | "BUY"): SimpleOpenSeaV1Order {

	return {
		...OPENSEA_ORDER_TEMPLATE,
		make: getAssetTypeBlank(makeAsset),
		take: getAssetTypeBlank(takeAsset),
		data: {...OPENSEA_ORDER_TEMPLATE.data, side},
	}

}
