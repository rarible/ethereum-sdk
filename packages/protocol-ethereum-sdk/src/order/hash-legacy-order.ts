import { Ethereum } from "@rarible/ethereum-provider"
import { keccak256 } from "ethereumjs-util"
import Web3 from "web3"
import {toAddress, toBinary} from "@rarible/types"
import {toBn} from "@rarible/utils/build/bn"
import { toLegacyAssetType } from "./to-legacy-asset-type"
import {hashOrder, SimpleOpenSeaV1Order, SimpleOrder} from "./sign-order"

export function hashLegacyOrder(ethereum: Ethereum, order: SimpleOrder): string {
	if (order.type !== "RARIBLE_V1") {
		throw new Error(`Not supported type: ${order.type}`)
	}
	const data = order.data
	if (data.dataType !== "LEGACY") {
		throw new Error(`Not supported data type: ${data.dataType}`)
	}

	const makeType = toLegacyAssetType(order.make.assetType)
	const takeType = toLegacyAssetType(order.take.assetType)

	const struct = {
		key: {
			owner: order.maker,
			salt: order.salt,
			sellAsset: makeType,
			buyAsset: takeType,
		},
		selling: order.make.value,
		buying: order.take.value,
		sellerFee: data.fee,
	}
	const encodedOrder = ethereum.encodeParameter({ Order: ORDER }, struct)
	return `0x${keccak256(Buffer.from(encodedOrder.substring(2), "hex")).toString("hex")}`
}

export function hashOpenSeaV1Order(ethereum: Ethereum, order: SimpleOpenSeaV1Order): string {
	// const order = makeOrder()

	// const hashResJs = hashOrder(order) || ""

	// const orderHash = Web3.utils.soliditySha3(
	// 	{type: "string", value: "\x19Ethereum Signed Message:\n32"},
	// 	{type: "bytes32", value: hashResJs}
	// )
	return ""
}

const ASSET = {
	token: "address",
	tokenId: "uint256",
	assetType: "uint8",
}

const ORDER = {
	key: {
		owner: "address",
		salt: "uint256",
		sellAsset: ASSET,
		buyAsset: ASSET,
	},
	selling: "uint256",
	buying: "uint256",
	sellerFee: "uint256",
}
