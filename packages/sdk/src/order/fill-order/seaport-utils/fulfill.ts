import type {
	BigNumberish,
	ContractTransaction,
	providers, Contract} from "ethers"
import { BigNumber, ethers } from "ethers"
import { BasicOrderRouteType, ItemType, NO_CONDUIT } from "./constants"
import type {
	ConsiderationItem,
	InputCriteria,
	Order,
	OrderParameters,
	OrderStatus,
} from "./types"
import { getApprovalActions } from "./approval"
import type {
	BalancesAndApprovals,
} from "./balance-and-approval-check"
import {
	validateBasicFulfillBalancesAndApprovals,
} from "./balance-and-approval-check"
import { getItemToCriteriaMap } from "./criteria"
import type {
	TimeBasedItemParams} from "./item"
import {
	getMaximumSizeForOrder,
	getSummedTokenAndIdentifierAmounts,
	isCriteriaItem,
	isCurrencyItem,
	isErc721Item,
	isNativeCurrencyItem,
} from "./item"
import {
	areAllCurrenciesSame,
	totalItemsAmount,
} from "./order"
import { executeAllActions, getTransactionMethods } from "./usecase"
import type { BasicOrderParametersStruct } from "./types"
import type { FulfillmentComponentStruct } from "./types"
import { gcd } from "./gcd"

/**
 * We should use basic fulfill order if the order adheres to the following criteria:
 * 1. The order should not be partially filled.
 * 2. The order only contains a single offer item and contains at least one consideration item
 * 3. The order does not offer an item with Ether (or other native tokens) as its item type.
 * 4. The order only contains a single ERC721 or ERC1155 item and that item is not criteria-based
 * 5. All other items have the same Native or ERC20 item type and token
 * 6. All items have the same startAmount and endAmount
 * 7. First consideration item must contain the offerer as the recipient
 * 8. If the order has multiple consideration items and all consideration items other than the
 *    first consideration item have the same item type as the offered item, the offered item
 *    amount is not less than the sum of all consideration item amounts excluding the
 *    first consideration item amount
 * 9. The token on native currency items needs to be set to the null address and the identifier on
 *    currencies needs to be zero, and the amounts on the 721 item need to be 1
 */
export const shouldUseBasicFulfill = (
	{ offer, consideration, offerer }: OrderParameters,
	totalFilled: OrderStatus["totalFilled"]
) => {
	// 1. The order must not be partially filled
	if (!totalFilled.eq(0)) {
		return false
	}

	// 2. Must be single offer and at least one consideration
	if (offer.length > 1 || consideration.length === 0) {
		return false
	}

	const allItems = [...offer, ...consideration]

	const nfts = allItems.filter(({ itemType }) =>
		[ItemType.ERC721, ItemType.ERC1155].includes(itemType)
	)

	const nftsWithCriteria = allItems.filter(({ itemType }) =>
		isCriteriaItem(itemType)
	)

	const offersNativeCurrency = isNativeCurrencyItem(offer[0])

	// 3. The order does not offer an item with Ether (or other native tokens) as its item type.
	if (offersNativeCurrency) {
		return false
	}

	// 4. The order only contains a single ERC721 or ERC1155 item and that item is not criteria-based
	if (nfts.length !== 1 || nftsWithCriteria.length !== 0) {
		return false
	}

	// 5. All currencies need to have the same address and item type (Native, ERC20)
	if (!areAllCurrenciesSame({ offer, consideration })) {
		return false
	}

	// 6. All individual items need to have the same startAmount and endAmount
	const differentStartAndEndAmount = allItems.some(
		({ startAmount, endAmount }) => startAmount !== endAmount
	)

	if (differentStartAndEndAmount) {
		return false
	}

	const [firstConsideration, ...restConsideration] = consideration

	// 7. First consideration item must contain the offerer as the recipient
	const firstConsiderationRecipientIsNotOfferer =
    firstConsideration.recipient.toLowerCase() !== offerer.toLowerCase()

	if (firstConsiderationRecipientIsNotOfferer) {
		return false
	}

	// 8. If the order has multiple consideration items and all consideration items other than the
	// first consideration item have the same item type as the offered item, the offered item
	// amount is not less than the sum of all consideration item amounts excluding the
	// first consideration item amount
	if (
		consideration.length > 1 &&
    restConsideration.every((item) => item.itemType === offer[0].itemType) &&
    totalItemsAmount(restConsideration).endAmount.gt(offer[0].endAmount)
	) {
		return false
	}

	const currencies = allItems.filter(isCurrencyItem)

	//  9. The token on native currency items needs to be set to the null address and the identifier on
	//  currencies needs to be zero, and the amounts on the 721 item need to be 1
	const nativeCurrencyIsZeroAddress = currencies
		.filter(({ itemType }) => itemType === ItemType.NATIVE)
		.every(({ token }) => token === ethers.constants.AddressZero)

	const currencyIdentifiersAreZero = currencies.every(
		({ identifierOrCriteria }) => BigNumber.from(identifierOrCriteria).eq(0)
	)

	const erc721sAreSingleAmount = nfts
		.filter(({ itemType }) => itemType === ItemType.ERC721)
		.every(({ endAmount }) => endAmount === "1")

	return (
		nativeCurrencyIsZeroAddress &&
    currencyIdentifiersAreZero &&
    erc721sAreSingleAmount
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

export async function fulfillBasicOrder({
	order,
	seaportContract,
	offererBalancesAndApprovals,
	fulfillerBalancesAndApprovals,
	timeBasedItemParams,
	offererOperator,
	fulfillerOperator,
	signer,
	tips = [],
	conduitKey = NO_CONDUIT,
}: {
	order: Order;
	seaportContract: Contract;
	offererBalancesAndApprovals: BalancesAndApprovals;
	fulfillerBalancesAndApprovals: BalancesAndApprovals;
	timeBasedItemParams: TimeBasedItemParams;
	offererOperator: string;
	fulfillerOperator: string;
	signer: providers.JsonRpcSigner;
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
	})[ethers.constants.AddressZero]?.["0"]

	const insufficientApprovals = validateBasicFulfillBalancesAndApprovals({
		offer,
		consideration: considerationIncludingTips,
		offererBalancesAndApprovals,
		fulfillerBalancesAndApprovals,
		timeBasedItemParams,
		offererOperator,
		fulfillerOperator,
	})

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

	const payableOverrides = { value: totalNativeAmount }

	//approve
	const approvalActions = await getApprovalActions(
		insufficientApprovals,
		signer
	)

	const exchangeAction = {
		type: "exchange",
		transactionMethods: getTransactionMethods(
			seaportContract.connect(signer),
			"fulfillBasicOrder",
			[basicOrderParameters, payableOverrides]
		),
	} as const

	const actions = [...approvalActions, exchangeAction] as const

	return {
		actions,
		executeAllActions: () =>
			executeAllActions(actions) as Promise<ContractTransaction>,
	}
}

export function validateAndSanitizeFromOrderStatus(
	order: Order,
	orderStatus: OrderStatus
): Order {
	const { isValidated, isCancelled, totalFilled, totalSize } = orderStatus

	if (totalSize.gt(0) && totalFilled.div(totalSize).eq(1)) {
		throw new Error("The order you are trying to fulfill is already filled")
	}

	if (isCancelled) {
		throw new Error("The order you are trying to fulfill is cancelled")
	}

	if (isValidated) {
		// If the order is already validated, manually wipe the signature off of the order to save gas
		return { parameters: { ...order.parameters }, signature: "0x" }
	}

	return order
}

export type FulfillOrdersMetadata = {
	order: Order;
	unitsToFill?: BigNumberish;
	orderStatus: OrderStatus;
	offerCriteria: InputCriteria[];
	considerationCriteria: InputCriteria[];
	tips: ConsiderationItem[];
	extraData: string;
	offererBalancesAndApprovals: BalancesAndApprovals;
	offererOperator: string;
}[]

export function generateFulfillOrdersFulfillments(
	ordersMetadata: FulfillOrdersMetadata
): {
		offerFulfillments: FulfillmentComponentStruct[];
		considerationFulfillments: FulfillmentComponentStruct[];
	} {
	const hashAggregateKey = ({
		sourceOrDestination,
		operator = "",
		token,
		identifier,
	}: {
		sourceOrDestination: string;
		operator?: string;
		token: string;
		identifier: string;
	}) => `${sourceOrDestination}-${operator}-${token}-${identifier}`

	const offerAggregatedFulfillments: Record<string, FulfillmentComponentStruct> = {}

	const considerationAggregatedFulfillments: Record<string, FulfillmentComponentStruct> = {}

	ordersMetadata.forEach(
		({ order, offererOperator, offerCriteria }, orderIndex) => {
			const itemToCriteria = getItemToCriteriaMap(
				order.parameters.offer,
				offerCriteria
			)

			return order.parameters.offer.forEach((item, itemIndex) => {
				const aggregateKey = `${hashAggregateKey({
					sourceOrDestination: order.parameters.offerer,
					operator: offererOperator,
					token: item.token,
					identifier:
            itemToCriteria.get(item)?.identifier ?? item.identifierOrCriteria,
					// We tack on the index to ensure that erc721s can never be aggregated and instead must be in separate arrays
				})}${isErc721Item(item.itemType) ? itemIndex : ""}`

				offerAggregatedFulfillments[aggregateKey] = [
					...(offerAggregatedFulfillments[aggregateKey] ?? []),
					{ orderIndex, itemIndex },
				]
			})
		}
	)

	ordersMetadata.forEach(
		({ order, considerationCriteria, tips }, orderIndex) => {
			const itemToCriteria = getItemToCriteriaMap(
				order.parameters.consideration,
				considerationCriteria
			)
			return [...order.parameters.consideration, ...tips].forEach(
				(item, itemIndex) => {
					const aggregateKey = `${hashAggregateKey({
						sourceOrDestination: item.recipient,
						token: item.token,
						identifier:
              itemToCriteria.get(item)?.identifier ?? item.identifierOrCriteria,
					})}${isErc721Item(item.itemType) ? itemIndex : ""}`

					considerationAggregatedFulfillments[aggregateKey] = [
						...(considerationAggregatedFulfillments[aggregateKey] ?? []),
						{ orderIndex, itemIndex },
					]
				}
			)
		}
	)

	return {
		offerFulfillments: Object.values(offerAggregatedFulfillments),
		considerationFulfillments: Object.values(
			considerationAggregatedFulfillments
		),
	}
}

export const getAdvancedOrderNumeratorDenominator = (
	order: Order,
	unitsToFill?: BigNumberish
) => {
	// Used for advanced order cases
	const maxUnits = getMaximumSizeForOrder(order)
	const unitsToFillBn = BigNumber.from(unitsToFill)

	// Reduce the numerator/denominator as optimization
	const unitsGcd = gcd(unitsToFillBn, maxUnits)

	const numerator = unitsToFill
		? unitsToFillBn.div(unitsGcd)
		: BigNumber.from(1)
	const denominator = unitsToFill ? maxUnits.div(unitsGcd) : BigNumber.from(1)

	return { numerator, denominator }
}
