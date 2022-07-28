import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumberValue} from "@rarible/utils"
import { BigNumber, toBn } from "@rarible/utils"
import { toAddress } from "@rarible/types"
import type { Address, Part } from "@rarible/ethereum-api-client"
import type { SendFunction } from "../../../common/send-transaction"
import type { SimpleSeaportV1Order } from "../../types"
import { createSeaportWrapper } from "../../contracts/seaport-wrapper"
import { createSeaportContract } from "../../contracts/seaport"
import { ExchangeWrapperOrderType } from "../types"
import { prepareForExchangeWrapperFees } from "../../../common/prepare-fee-for-exchange-wrapper"
import type { InputCriteria } from "./types"
import { CONDUIT_KEYS_TO_CONDUIT, CROSS_CHAIN_DEFAULT_CONDUIT_KEY, CROSS_CHAIN_SEAPORT_ADDRESS } from "./constants"
import { convertAPIOrderToSeaport } from "./convert-to-seaport-order"
import { getBalancesAndApprovals } from "./balance-and-approval-check"
import { getOrderHash } from "./get-order-hash"
import { validateAndSanitizeFromOrderStatus } from "./fulfill"
import { getFulfillAvailableOrdersData } from "./fulfill-available-orders"

export async function fulfillOrderWithWrapper(
	ethereum: Ethereum,
	send: SendFunction,
	simpleOrder: SimpleSeaportV1Order,
	{unitsToFill, seaportWrapper, originFees}: {
		unitsToFill?: BigNumberValue,
		seaportWrapper: Address,
		originFees?: Part[]
	}
) {
	const seaportContract = createSeaportContract(ethereum, toAddress(CROSS_CHAIN_SEAPORT_ADDRESS))

	const order = convertAPIOrderToSeaport(simpleOrder)

	const fulfillerAddress = await ethereum.getFrom()
	const { parameters: orderParameters } = order
	const { offerer, offer, consideration } = orderParameters

	const offererOperator = CONDUIT_KEYS_TO_CONDUIT[orderParameters.conduitKey]

	const conduitKey = CROSS_CHAIN_DEFAULT_CONDUIT_KEY
	const fulfillerOperator = CONDUIT_KEYS_TO_CONDUIT[conduitKey]

	const extraData = "0x"
	const recipientAddress = fulfillerAddress
	const offerCriteria: InputCriteria[] = []
	const considerationCriteria: InputCriteria[] = []

	const [
		offererBalancesAndApprovals,
		fulfillerBalancesAndApprovals,
		orderStatus,
	] = await Promise.all([
		getBalancesAndApprovals({
			ethereum,
			owner: offerer,
			items: offer,
			criterias: offerCriteria,
			operator: offererOperator,
		}),
		getBalancesAndApprovals({
			ethereum,
			owner: fulfillerAddress,
			items: [...offer, ...consideration],
			criterias: [...offerCriteria, ...considerationCriteria],
			operator: fulfillerOperator,
		}),
		seaportContract.functionCall("getOrderStatus", getOrderHash(orderParameters)).call(),
	])


	orderStatus.totalFilled = toBn(orderStatus.totalFilled)
	orderStatus.totalSize = toBn(orderStatus.totalSize)

	const sanitizedOrder = validateAndSanitizeFromOrderStatus(
		order,
		orderStatus
	)

	const timeBasedItemParams = {
		startTime: sanitizedOrder.parameters.startTime,
		endTime: sanitizedOrder.parameters.endTime,
		currentBlockTimestamp: Math.floor(Date.now() / 1000),
		ascendingAmountTimestampBuffer: 300,
	}

	const fulfillOrdersData = await getFulfillAvailableOrdersData({
		ethereum,
		send,
		ordersMetadata: [{
			order: sanitizedOrder,
			unitsToFill,
			orderStatus,
			offerCriteria,
			considerationCriteria,
			tips: [],
			extraData,
			offererBalancesAndApprovals,
			offererOperator,
		}],
		seaportAddress: toAddress(CROSS_CHAIN_SEAPORT_ADDRESS),
		fulfillerBalancesAndApprovals,
		fulfillerOperator,
		currentBlockTimestamp: timeBasedItemParams.currentBlockTimestamp,
		ascendingAmountTimestampBuffer: timeBasedItemParams.ascendingAmountTimestampBuffer,
		conduitKey,
		recipientAddress,
	})

	const data = {
		marketId: ExchangeWrapperOrderType.SEAPORT_ADVANCED_ORDERS,
		amount: fulfillOrdersData.value,
		data: fulfillOrdersData.data,
	}

	const seaportWrapperContract = createSeaportWrapper(ethereum, seaportWrapper)
	const originFeesPrepared = prepareForExchangeWrapperFees(originFees || [])
	const feesValueInBasisPoints = originFees?.reduce((acc, part) => {
		return acc += part.value
	}, 0) || 0
	const feesValue = toBn(feesValueInBasisPoints)
		.dividedBy(10000)
		.multipliedBy(data.amount)
		.integerValue(BigNumber.ROUND_FLOOR)
	const valueForSending = feesValue.plus(data.amount)

	return send(
		seaportWrapperContract.functionCall("singlePurchase", data, originFeesPrepared),
		{ value: valueForSending.toString() }
	)
}
