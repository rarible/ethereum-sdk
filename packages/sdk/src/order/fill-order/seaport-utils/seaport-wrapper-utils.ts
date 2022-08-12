import type { Ethereum } from "@rarible/ethereum-provider"
import type { BigNumberValue } from "@rarible/utils"
import { toBn } from "@rarible/utils"
import { toAddress } from "@rarible/types"
import type { Address, Part } from "@rarible/ethereum-api-client"
import { toBigNumber } from "@rarible/types/build/big-number"
import type { SendFunction } from "../../../common/send-transaction"
import type { SimpleSeaportV1Order } from "../../types"
import { createSeaportContract } from "../../contracts/seaport"
import type { OrderFillSendData } from "../types"
import { ExchangeWrapperOrderType } from "../types"
import { createExchangeWrapperContract } from "../../contracts/exchange-wrapper"
import { calcValueWithFees, originFeeValueConvert } from "../common/origin-fees-utils"
import type { InputCriteria } from "./types"
import { CONDUIT_KEYS_TO_CONDUIT, CROSS_CHAIN_DEFAULT_CONDUIT_KEY, CROSS_CHAIN_SEAPORT_ADDRESS } from "./constants"
import { convertAPIOrderToSeaport } from "./convert-to-seaport-order"
import { getBalancesAndApprovals } from "./balance-and-approval-check"
import { getOrderHash } from "./get-order-hash"
import { validateAndSanitizeFromOrderStatus } from "./fulfill"
import { getFulfillAdvancedOrderData } from "./fulfill-advance"

export async function fulfillOrderWithWrapper(
	ethereum: Ethereum,
	send: SendFunction,
	simpleOrder: SimpleSeaportV1Order,
	{unitsToFill, seaportWrapper, originFees}: {
		unitsToFill?: BigNumberValue,
		seaportWrapper: Address,
		originFees?: Part[]
	}
): Promise<OrderFillSendData> {
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

	const fulfillOrdersData = await getFulfillAdvancedOrderData({
		ethereum,
		send,
		order: sanitizedOrder,
		unitsToFill,
		totalSize: orderStatus.totalSize,
		totalFilled: orderStatus.totalFilled,
		offerCriteria,
		considerationCriteria,
		tips: [],
		extraData,
		seaportAddress: toAddress(CROSS_CHAIN_SEAPORT_ADDRESS),
		offererBalancesAndApprovals,
		fulfillerBalancesAndApprovals,
		offererOperator,
		fulfillerOperator,
		timeBasedItemParams,
		conduitKey,
		recipientAddress,
	})

	const {originFeeConverted, totalFeeBasisPoints} = originFeeValueConvert(originFees)

	const data = {
		marketId: ExchangeWrapperOrderType.SEAPORT_ADVANCED_ORDERS,
		amount: fulfillOrdersData.value,
		addFee: totalFeeBasisPoints > 0,
		data: fulfillOrdersData.data,
	}

	const seaportWrapperContract = createExchangeWrapperContract(ethereum, seaportWrapper)
	const valueForSending = calcValueWithFees(toBigNumber(data.amount), totalFeeBasisPoints)
	const functionCall = seaportWrapperContract.functionCall("singlePurchase", data, originFeeConverted[0], originFeeConverted[1])

	return {
		functionCall,
		options: { value: valueForSending.toString() },
	}
}
