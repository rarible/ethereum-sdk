import type { BigNumberValue} from "@rarible/utils/build/bn"
import { toBn } from "@rarible/utils/build/bn"
import { ZERO_ADDRESS } from "@rarible/types"
import type { Ethereum } from "@rarible/ethereum-provider"
import type { Address } from "@rarible/ethereum-api-client"
import { getTransactionMethods } from "../../../../build/order/fill-order/seaport-utils/usecase"
import { createSeaportContract } from "../../contracts/seaport"
import type { SendFunction } from "../../../common/send-transaction"
import type { AdvancedOrder, ConsiderationItem, InputCriteria, Order, OrderStatus } from "./types"
import type { BalancesAndApprovals, InsufficientApprovals } from "./balance-and-approval-check"
import {
	generateFulfillOrdersFulfillments,
	getAdvancedOrderNumeratorDenominator,
	validateAndSanitizeFromOrderStatus,
} from "./fulfill"
import { mapOrderAmountsFromFilledStatus, mapOrderAmountsFromUnitsToFill } from "./order"
import { getSummedTokenAndIdentifierAmounts, isCriteriaItem } from "./item"
import { validateStandardFulfillBalancesAndApprovals } from "./balance-and-approval-check"
import { getApprovalActions } from "./approval"
import { generateCriteriaResolvers } from "./criteria"

export type FulfillOrdersMetadata = {
	order: Order;
	unitsToFill?: BigNumberValue;
	orderStatus: OrderStatus;
	offerCriteria: InputCriteria[];
	considerationCriteria: InputCriteria[];
	tips: ConsiderationItem[];
	extraData: string;
	offererBalancesAndApprovals: BalancesAndApprovals;
	offererOperator: string;
}[]

export async function fulfillAvailableOrders({
	ethereum,
	send,
	ordersMetadata,
	seaportAddress,
	fulfillerBalancesAndApprovals,
	fulfillerOperator,
	currentBlockTimestamp,
	ascendingAmountTimestampBuffer,
	conduitKey,
	recipientAddress,
}: {
	ethereum: Ethereum,
	send: SendFunction,
	ordersMetadata: FulfillOrdersMetadata;
	seaportAddress: Address;
	fulfillerBalancesAndApprovals: BalancesAndApprovals;
	fulfillerOperator: string;
	currentBlockTimestamp: number;
	ascendingAmountTimestampBuffer: number;
	conduitKey: string;
	recipientAddress: string;
}) {
	const seaportContract = createSeaportContract(ethereum, seaportAddress)

	const sanitizedOrdersMetadata = ordersMetadata.map((orderMetadata) => ({
		...orderMetadata,
		order: validateAndSanitizeFromOrderStatus(
			orderMetadata.order,
			orderMetadata.orderStatus
		),
	}))

	const ordersMetadataWithAdjustedFills = sanitizedOrdersMetadata.map(
		(orderMetadata) => ({
			...orderMetadata,
			// If we are supplying units to fill, we adjust the order by the minimum of the amount to fill and
			// the remaining order left to be fulfilled
			order: orderMetadata.unitsToFill
				? mapOrderAmountsFromUnitsToFill(orderMetadata.order, {
					unitsToFill: orderMetadata.unitsToFill,
					totalFilled: toBn(orderMetadata.orderStatus.totalFilled),
					totalSize: toBn(orderMetadata.orderStatus.totalSize),
				})
				: // Else, we adjust the order by the remaining order left to be fulfilled
				mapOrderAmountsFromFilledStatus(orderMetadata.order, {
					totalFilled: toBn(orderMetadata.orderStatus.totalFilled),
					totalSize: toBn(orderMetadata.orderStatus.totalSize),
				}),
		})
	)

	let totalNativeAmount = toBn(0)
	const totalInsufficientApprovals: InsufficientApprovals = []
	const hasCriteriaItems = false

	const addApprovalIfNeeded = (
		orderInsufficientApprovals: InsufficientApprovals
	) => {
		orderInsufficientApprovals.forEach((insufficientApproval) => {
			if (
				!totalInsufficientApprovals.find(
					(approval) => approval.token === insufficientApproval.token
				)
			) {
				totalInsufficientApprovals.push(insufficientApproval)
			}
		})
	}

	ordersMetadataWithAdjustedFills.forEach(
		({
			order,
			tips,
			offerCriteria,
			considerationCriteria,
			offererBalancesAndApprovals,
			offererOperator,
		}) => {
			const considerationIncludingTips = [
				...order.parameters.consideration,
				...tips,
			]

			const timeBasedItemParams = {
				startTime: order.parameters.startTime,
				endTime: order.parameters.endTime,
				currentBlockTimestamp,
				ascendingAmountTimestampBuffer,
				isConsiderationItem: true,
			}

			totalNativeAmount = totalNativeAmount.plus(
				getSummedTokenAndIdentifierAmounts({
					items: considerationIncludingTips,
					criterias: considerationCriteria,
					timeBasedItemParams,
				})[ZERO_ADDRESS]?.["0"] ?? toBn(0)
			)

			const insufficientApprovals = validateStandardFulfillBalancesAndApprovals(
				{
					offer: order.parameters.offer,
					consideration: considerationIncludingTips,
					offerCriteria,
					considerationCriteria,
					offererBalancesAndApprovals,
					fulfillerBalancesAndApprovals,
					timeBasedItemParams,
					offererOperator,
					fulfillerOperator,
				}
			)

			const offerCriteriaItems = order.parameters.offer.filter(({ itemType }) =>
				isCriteriaItem(itemType)
			)

			const considerationCriteriaItems = considerationIncludingTips.filter(
				({ itemType }) => isCriteriaItem(itemType)
			)

			if (
				offerCriteriaItems.length !== offerCriteria.length ||
        considerationCriteriaItems.length !== considerationCriteria.length
			) {
				throw new Error(
					"You must supply the appropriate criterias for criteria based items"
				)
			}

			addApprovalIfNeeded(insufficientApprovals)
		}
	)

	console.log("before getApprovalActions")
	const approvalActions = await getApprovalActions(
		ethereum,
		send,
		totalInsufficientApprovals,
	)
	await Promise.all(approvalActions)
	console.log("after getApprovalActions")

	const advancedOrdersWithTips: AdvancedOrder[] = sanitizedOrdersMetadata.map(
		({ order, unitsToFill = 0, tips, extraData }) => {
			const { numerator, denominator } = getAdvancedOrderNumeratorDenominator(
				order,
				unitsToFill
			)

			const considerationIncludingTips = [
				...order.parameters.consideration,
				...tips,
			]
			return {
				...order,
				parameters: {
					...order.parameters,
					consideration: considerationIncludingTips,
					totalOriginalConsiderationItems:
          order.parameters.consideration.length,
				},
				numerator,
				denominator,
				extraData,
			}
		}
	)

	const { offerFulfillments, considerationFulfillments } =
    generateFulfillOrdersFulfillments(ordersMetadata)

	// const exchangeAction = {
	// 	type: "exchange",
	// 	transactionMethods: getTransactionMethods(
	// 		seaportContract.connect(signer),
	// 		"fulfillAvailableAdvancedOrders",
	//
	// 	),
	// } as const

	// const actions = [...approvalActions, exchangeAction] as const

	// return {
	// 	actions,
	// 	executeAllActions: () =>
	// 		executeAllActions(actions) as Promise<ContractTransaction>,
	// }
	const fulfillArguments = [
		advancedOrdersWithTips,
		hasCriteriaItems
			? generateCriteriaResolvers({
				orders: ordersMetadata.map(({ order }) => order),
				offerCriterias: ordersMetadata.map(
					({ offerCriteria }) => offerCriteria
				),
				considerationCriterias: ordersMetadata.map(
					({ considerationCriteria }) => considerationCriteria
				),
			})
			: [],
		offerFulfillments,
		considerationFulfillments,
		conduitKey,
		recipientAddress,
		`0x${advancedOrdersWithTips.length.toString(16)}`,
	]
	console.log("fulfillArguments", JSON.stringify(fulfillArguments, null, "  "))

	return {
		data: seaportContract.functionCall("fulfillAvailableAdvancedOrders", ...fulfillArguments).data,
		value: totalNativeAmount.toString(),
	}
	// return send(
	// 	seaportContract.functionCall("fulfillAvailableAdvancedOrders", ...fulfillArguments),
	// 	{ value: totalNativeAmount.toString() }
	// )
}
