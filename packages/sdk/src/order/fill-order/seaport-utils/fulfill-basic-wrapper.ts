import type { Ethereum } from "@rarible/ethereum-provider"
import { toAddress, ZERO_ADDRESS } from "@rarible/types"
import type { Address } from "@rarible/ethereum-api-client"
import { createSeaportContract } from "../../contracts/seaport"
import type { SendFunction } from "../../../common/send-transaction"
import type { BasicOrderParametersStruct, ConsiderationItem, Order } from "./types"
import { getSummedTokenAndIdentifierAmounts } from "./item"
import type { TimeBasedItemParams } from "./item"
import { BasicOrderRouteType, CROSS_CHAIN_SEAPORT_ADDRESS, ItemType, NO_CONDUIT } from "./constants"

export async function fulfillBasicOrderWithWrapper({
	ethereum,
	send,
	order,
	timeBasedItemParams,
	tips = [],
	conduitKey = NO_CONDUIT,
	seaportWrapper,
}: {
	ethereum: Ethereum,
	send: SendFunction,
	seaportWrapper: Address,
	order: Order;
	timeBasedItemParams: TimeBasedItemParams;
	tips?: ConsiderationItem[];
	conduitKey: string;
}) {
	const { offer, consideration } = order.parameters
	const considerationIncludingTips = [...consideration, ...tips]

	const offerItem = offer[0]
	const [forOfferer, ...forAdditionalRecipients] = considerationIncludingTips

	const basicOrderRouteType =
    offerAndConsiderationFulfillmentMapping[offerItem.itemType]?.[
    	forOfferer.itemType
    ]

	if (basicOrderRouteType === undefined) {
		throw new Error(
			"Order parameters did not result in a valid basic fulfillment"
		)
	}

	const additionalRecipients = forAdditionalRecipients.map(
		({ startAmount, recipient }) => ({
			amount: startAmount,
			recipient,
		})
	)

	const considerationWithoutOfferItemType = considerationIncludingTips.filter(
		(item) => item.itemType !== offer[0].itemType
	)

	const totalNativeAmount = getSummedTokenAndIdentifierAmounts({
		items: considerationWithoutOfferItemType,
		criterias: [],
		timeBasedItemParams: {
			...timeBasedItemParams,
			isConsiderationItem: true,
		},
	})[ZERO_ADDRESS]?.["0"]

	const basicOrderParameters: BasicOrderParametersStruct = {
		offerer: order.parameters.offerer,
		offererConduitKey: order.parameters.conduitKey,
		zone: order.parameters.zone,
		//  Note the use of a "basicOrderType" enum;
		//  this represents both the usual order type as well as the "route"
		//  of the basic order (a simple derivation function for the basic order
		//  type is `basicOrderType = orderType + (4 * basicOrderRoute)`.)
		basicOrderType: order.parameters.orderType + 4 * basicOrderRouteType,
		offerToken: offerItem.token,
		offerIdentifier: offerItem.identifierOrCriteria,
		offerAmount: offerItem.endAmount,
		considerationToken: forOfferer.token,
		considerationIdentifier: forOfferer.identifierOrCriteria,
		considerationAmount: forOfferer.endAmount,
		startTime: order.parameters.startTime,
		endTime: order.parameters.endTime,
		salt: order.parameters.salt,
		totalOriginalAdditionalRecipients:
      order.parameters.consideration.length - 1,
		signature: order.signature,
		fulfillerConduitKey: conduitKey,
		additionalRecipients,
		zoneHash: order.parameters.zoneHash,
	}

	const seaportContract = createSeaportContract(ethereum, seaportWrapper)
	return send(
		seaportContract.functionCall("fulfillBasicOrder", basicOrderParameters),
		{ value: totalNativeAmount?.toString() }
	)
}

const offerAndConsiderationFulfillmentMapping: {
	[_key in ItemType]?: { [_key in ItemType]?: BasicOrderRouteType };
} = {
	[ItemType.ERC20]: {
		[ItemType.ERC721]: BasicOrderRouteType.ERC721_TO_ERC20,
		[ItemType.ERC1155]: BasicOrderRouteType.ERC1155_TO_ERC20,
	},
	[ItemType.ERC721]: {
		[ItemType.NATIVE]: BasicOrderRouteType.ETH_TO_ERC721,
		[ItemType.ERC20]: BasicOrderRouteType.ERC20_TO_ERC721,
	},
	[ItemType.ERC1155]: {
		[ItemType.NATIVE]: BasicOrderRouteType.ETH_TO_ERC1155,
		[ItemType.ERC20]: BasicOrderRouteType.ERC20_TO_ERC1155,
	},
} as const

export function getSeaportBasicData(ethereum: Ethereum, basicParameters: BasicOrderParametersStruct) {
	ethereum.encodeParameter(
		SEAPORT_BASIC_DATA_TYPE,
		basicParameters
	)
}
const SEAPORT_BASIC_DATA_TYPE = {
	components: [
		{ name: "considerationToken", type: "address" },
		{ name: "considerationIdentifier", type: "uint256" },
		{ name: "considerationAmount", type: "uint256" },
		{ name: "offerer", type: "address" },
		{ name: "zone", type: "address" },
		{ name: "offerToken", type: "address" },
		{ name: "offerIdentifier", type: "uint256" },
		{ name: "offerAmount", type: "uint256" },
		{ name: "startTime", type: "uint256" },
		{ name: "endTime", type: "uint256" },
		{ name: "zoneHash", type: "uint256" },
		{ name: "salt", type: "uint256" },
		{ name: "offererConduitKey", type: "bytes32" },
		{ name: "fulfillerConduitKey", type: "bytes32" },
		{ name: "totalOriginalAdditionalRecipients", type: "uint256" },
		{ name: "signature", type: "bytes" },
		{
			name: "additionalRecipients",
			type: "tuple[]",
			components: [
				{ name: "amount", type: "uint256" },
				{ name: "recipient", type: "address" },
			],
		},
		{ name: "basicOrderType", type: "uint8" },
	],
	name: "data",
	type: "tuple",
}


export enum BasicOrderType {
	// 0: no partial fills, anyone can execute
	ETH_TO_ERC721_FULL_OPEN,

	// 1: partial fills supported, anyone can execute
	ETH_TO_ERC721_PARTIAL_OPEN,

	// 2: no partial fills, only offerer or zone can execute
	ETH_TO_ERC721_FULL_RESTRICTED,

	// 3: partial fills supported, only offerer or zone can execute
	ETH_TO_ERC721_PARTIAL_RESTRICTED,

	// 4: no partial fills, anyone can execute
	ETH_TO_ERC1155_FULL_OPEN,

	// 5: partial fills supported, anyone can execute
	ETH_TO_ERC1155_PARTIAL_OPEN,

	// 6: no partial fills, only offerer or zone can execute
	ETH_TO_ERC1155_FULL_RESTRICTED,

	// 7: partial fills supported, only offerer or zone can execute
	ETH_TO_ERC1155_PARTIAL_RESTRICTED,

	// 8: no partial fills, anyone can execute
	ERC20_TO_ERC721_FULL_OPEN,

	// 9: partial fills supported, anyone can execute
	ERC20_TO_ERC721_PARTIAL_OPEN,

	// 10: no partial fills, only offerer or zone can execute
	ERC20_TO_ERC721_FULL_RESTRICTED,

	// 11: partial fills supported, only offerer or zone can execute
	ERC20_TO_ERC721_PARTIAL_RESTRICTED,

	// 12: no partial fills, anyone can execute
	ERC20_TO_ERC1155_FULL_OPEN,

	// 13: partial fills supported, anyone can execute
	ERC20_TO_ERC1155_PARTIAL_OPEN,

	// 14: no partial fills, only offerer or zone can execute
	ERC20_TO_ERC1155_FULL_RESTRICTED,

	// 15: partial fills supported, only offerer or zone can execute
	ERC20_TO_ERC1155_PARTIAL_RESTRICTED,

	// 16: no partial fills, anyone can execute
	ERC721_TO_ERC20_FULL_OPEN,

	// 17: partial fills supported, anyone can execute
	ERC721_TO_ERC20_PARTIAL_OPEN,

	// 18: no partial fills, only offerer or zone can execute
	ERC721_TO_ERC20_FULL_RESTRICTED,

	// 19: partial fills supported, only offerer or zone can execute
	ERC721_TO_ERC20_PARTIAL_RESTRICTED,

	// 20: no partial fills, anyone can execute
	ERC1155_TO_ERC20_FULL_OPEN,

	// 21: partial fills supported, anyone can execute
	ERC1155_TO_ERC20_PARTIAL_OPEN,

	// 22: no partial fills, only offerer or zone can execute
	ERC1155_TO_ERC20_FULL_RESTRICTED,

	// 23: partial fills supported, only offerer or zone can execute
	ERC1155_TO_ERC20_PARTIAL_RESTRICTED
}
