import type { BigNumberish, Contract, ContractTransaction, BigNumber, providers } from "ethers"
import { ethers } from "ethers"
import type { BalancesAndApprovals} from "./balance-and-approval-check"
import { validateStandardFulfillBalancesAndApprovals } from "./balance-and-approval-check"
import type { ConsiderationItem, InputCriteria, Order, OrderStruct } from "./types"
import type { TimeBasedItemParams } from "./item"
import { getSummedTokenAndIdentifierAmounts, isCriteriaItem } from "./item"
import { mapOrderAmountsFromFilledStatus, mapOrderAmountsFromUnitsToFill } from "./order"
import { getApprovalActions } from "./approval"
import { executeAllActions, getTransactionMethods } from "./usecase"
import { generateCriteriaResolvers } from "./criteria"
import { getAdvancedOrderNumeratorDenominator } from "./fulfill"

export async function fulfillStandardOrder({
	order,
	unitsToFill = 0,
	totalSize,
	totalFilled,
	offerCriteria,
	considerationCriteria,
	tips = [],
	extraData,
	seaportContract,
	offererBalancesAndApprovals,
	fulfillerBalancesAndApprovals,
	offererOperator,
	fulfillerOperator,
	timeBasedItemParams,
	conduitKey,
	recipientAddress,
	signer,
}: {
	order: Order;
	unitsToFill?: BigNumberish;
	totalFilled: BigNumber;
	totalSize: BigNumber;
	offerCriteria: InputCriteria[];
	considerationCriteria: InputCriteria[];
	tips?: ConsiderationItem[];
	extraData?: string;
	seaportContract: Contract;
	offererBalancesAndApprovals: BalancesAndApprovals;
	fulfillerBalancesAndApprovals: BalancesAndApprovals;
	offererOperator: string;
	fulfillerOperator: string;
	conduitKey: string;
	recipientAddress: string;
	timeBasedItemParams: TimeBasedItemParams;
	signer: providers.JsonRpcSigner;
}) {
	// If we are supplying units to fill, we adjust the order by the minimum of the amount to fill and
	// the remaining order left to be fulfilled
	const orderWithAdjustedFills = unitsToFill
		? mapOrderAmountsFromUnitsToFill(order, {
			unitsToFill,
			totalFilled,
			totalSize,
		})
		: // Else, we adjust the order by the remaining order left to be fulfilled
		mapOrderAmountsFromFilledStatus(order, {
			totalFilled,
			totalSize,
		})

	const {
		parameters: { offer, consideration },
	} = orderWithAdjustedFills

	const considerationIncludingTips = [...consideration, ...tips]

	const offerCriteriaItems = offer.filter(({ itemType }) =>
		isCriteriaItem(itemType)
	)

	const considerationCriteriaItems = considerationIncludingTips.filter(
		({ itemType }) => isCriteriaItem(itemType)
	)

	const hasCriteriaItems =
    offerCriteriaItems.length > 0 || considerationCriteriaItems.length > 0

	if (
		offerCriteriaItems.length !== offerCriteria.length ||
    considerationCriteriaItems.length !== considerationCriteria.length
	) {
		throw new Error(
			"You must supply the appropriate criterias for criteria based items"
		)
	}

	const totalNativeAmount = getSummedTokenAndIdentifierAmounts({
		items: considerationIncludingTips,
		criterias: considerationCriteria,
		timeBasedItemParams: {
			...timeBasedItemParams,
			isConsiderationItem: true,
		},
	})[ethers.constants.AddressZero]?.["0"]

	const insufficientApprovals = validateStandardFulfillBalancesAndApprovals({
		offer,
		consideration: considerationIncludingTips,
		offerCriteria,
		considerationCriteria,
		offererBalancesAndApprovals,
		fulfillerBalancesAndApprovals,
		timeBasedItemParams,
		offererOperator,
		fulfillerOperator,
	})

	const payableOverrides = { value: totalNativeAmount }

	const approvalActions = await getApprovalActions(
		insufficientApprovals,
		signer
	)

	const isGift = recipientAddress !== ethers.constants.AddressZero

	const useAdvanced = Boolean(unitsToFill) || hasCriteriaItems || isGift

	const orderAccountingForTips: OrderStruct = {
		...order,
		parameters: {
			...order.parameters,
			consideration: [...order.parameters.consideration, ...tips],
			totalOriginalConsiderationItems: consideration.length,
		},
	}

	const { numerator, denominator } = getAdvancedOrderNumeratorDenominator(
		order,
		unitsToFill
	)

	const exchangeAction = {
		type: "exchange",
		transactionMethods: useAdvanced
			? getTransactionMethods(
				seaportContract.connect(signer),
				"fulfillAdvancedOrder",
				[
					{
						...orderAccountingForTips,
						numerator,
						denominator,
						extraData: extraData ?? "0x",
					},
					hasCriteriaItems
						? generateCriteriaResolvers({
							orders: [order],
							offerCriterias: [offerCriteria],
							considerationCriterias: [considerationCriteria],
						})
						: [],
					conduitKey,
					recipientAddress,
					payableOverrides,
				]
			)
			: getTransactionMethods(seaportContract.connect(signer), "fulfillOrder", [
				orderAccountingForTips,
				conduitKey,
				payableOverrides,
			]),
	} as const

	const actions = [...approvalActions, exchangeAction] as const

	return {
		actions,
		executeAllActions: () =>
			executeAllActions(actions) as Promise<ContractTransaction>,
	}
}
