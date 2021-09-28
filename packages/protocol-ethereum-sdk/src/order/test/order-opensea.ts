import {Asset} from "@rarible/protocol-api-client"
import {toAddress, toBigNumber, toBinary, toWord, ZERO_ADDRESS} from "@rarible/types"
import {Ethereum} from "@rarible/ethereum-provider"
import {ethers} from "ethers"
import {convertOpenSeaOrderToSignDTO, SimpleOpenSeaV1Order} from "../sign-order"
import {OpenSeaOrderToSignDTO} from "../../common/orders"

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
		makerRelayerFee: toBigNumber("250"),
		takerRelayerFee: toBigNumber("250"),
		makerProtocolFee: toBigNumber("250"),
		takerProtocolFee: toBigNumber("250"),
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

//TODO replace web3.eth.sign
export async function getOrderSignature(ethereum: Ethereum, order: SimpleOpenSeaV1Order): Promise<string> {
	const web3: any = (ethereum as any)["config"].web3
	const from = await ethereum.getFrom()
	return web3.eth.sign(hashOpenSeaV1Order(ethereum, order), from)
}


const hashOrderType = [
	"address",
	"address",
	"address",
	"uint",
	"uint",
	"uint",
	"uint",
	"address",
	"uint8",
	"uint8",
	"uint8",
	"address",
	"uint8",
	"bytes",
	"bytes",
	"address",
	"bytes",
	"address",
	"uint",
	"uint",
	"uint",
	"uint",
	"uint",
]

export function hashOrder(order: OpenSeaOrderToSignDTO): string {
	return ethers.utils.solidityKeccak256(hashOrderType, [
		order.exchange,
		order.maker,
		order.taker,
		order.makerRelayerFee,
		order.takerRelayerFee,
		order.makerProtocolFee,
		order.takerProtocolFee,
		order.feeRecipient,
		order.feeMethod,
		order.side,
		order.saleKind,
		order.target,
		order.howToCall,
		order.calldata,
		order.replacementPattern,
		order.staticTarget,
		order.staticExtradata,
		order.paymentToken,
		order.basePrice,
		order.extra,
		order.listingTime,
		order.expirationTime,
		order.salt,
	])
}

export function hashToSign(hash: string): string {
	return ethers.utils.solidityKeccak256(
		["string", "bytes32"],
		["\x19Ethereum Signed Message:\n32", hash]
	)
}

export function hashOpenSeaV1Order(ethereum: Ethereum, order: SimpleOpenSeaV1Order): string {
	return hashOrder(convertOpenSeaOrderToSignDTO(ethereum, order))
}
