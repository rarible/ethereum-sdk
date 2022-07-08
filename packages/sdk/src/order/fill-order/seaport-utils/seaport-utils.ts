import { ZERO_ADDRESS } from "@rarible/types"
import { providers as multicallProviders } from "@0xsequence/multicall"
import type { providers, BigNumberish} from "ethers"
import { Contract, ethers } from "ethers"
import { formatBytes32String, _TypedDataEncoder } from "ethers/lib/utils"
import { SeaportABI } from "../../contracts/seaport"
import { getBalancesAndApprovals, validateOfferBalancesAndApprovals } from "./balance-and-approval-check"
import { fulfillBasicOrder, shouldUseBasicFulfill, validateAndSanitizeFromOrderStatus } from "./fulfill"
import type {
	CreateOrderAction,
	CreateOrderInput,
	InputCriteria,
	OrderComponents,
	OrderParameters,
	OrderUseCase,
	OrderWithCounter,
	SeaportContract,
	TipInputItem,
} from "./types"
import {
	areAllCurrenciesSame, deductFees, feeToConsiderationItem,
	generateRandomSalt,
	mapInputItemToOfferItem,
	totalItemsAmount,
} from "./order"
import { getOrderHash } from "./get-order-hash"
import { getMaximumSizeForOrder, isCurrencyItem } from "./item"
import { getApprovalActions } from "./approval"
import {
	EIP_712_ORDER_TYPE,
	MAX_INT,
	OrderType,
	SEAPORT_CONTRACT_NAME,
	SEAPORT_CONTRACT_VERSION,
} from "./constants"
import { executeAllActions } from "./usecase"
import { fulfillStandardOrder } from "./fulfill-standard-order"

export async function fulfillOrder(
	provider: providers.JsonRpcProvider,
	{
		order,
		unitsToFill,
		offerCriteria = [],
		considerationCriteria = [],
		tips = [],
		extraData = "0x",
		accountAddress,
		conduitKey = CROSS_CHAIN_DEFAULT_CONDUIT_KEY,
		recipientAddress = ZERO_ADDRESS,
	}: {
		order: OrderWithCounter;
		unitsToFill?: BigNumberish;
		offerCriteria?: InputCriteria[];
		considerationCriteria?: InputCriteria[];
		tips?: TipInputItem[];
		extraData?: string;
		accountAddress?: string;
		conduitKey?: string;
		recipientAddress?: string;
	}) {
	const { parameters: orderParameters } = order
	const { offerer, offer, consideration } = orderParameters

	const fulfiller = await provider.getSigner(accountAddress)

	const fulfillerAddress = await fulfiller.getAddress()

	const offererOperator = CONDUIT_KEYS_TO_CONDUIT[orderParameters.conduitKey]

	const fulfillerOperator = CONDUIT_KEYS_TO_CONDUIT[conduitKey]

	const multicallProvider = new multicallProviders.MulticallProvider(provider)

	const contract = new Contract(
		CROSS_CHAIN_SEAPORT_ADDRESS,
		SeaportABI,
		multicallProvider
	) as SeaportContract

	const [
		offererBalancesAndApprovals,
		fulfillerBalancesAndApprovals,
		currentBlock,
		orderStatus,
	] = await Promise.all([
		getBalancesAndApprovals({
			owner: offerer,
			items: offer,
			criterias: offerCriteria,
			multicallProvider: multicallProvider,
			operator: offererOperator,
		}),
		getBalancesAndApprovals({
			owner: fulfillerAddress,
			items: [...offer, ...consideration],
			criterias: [...offerCriteria, ...considerationCriteria],
			multicallProvider: multicallProvider,
			operator: fulfillerOperator,
		}),
		multicallProvider.getBlock("latest"),
		contract.getOrderStatus(getOrderHash(orderParameters)),
	])

	const currentBlockTimestamp = currentBlock.timestamp

	const { totalFilled, totalSize } = orderStatus

	const sanitizedOrder = validateAndSanitizeFromOrderStatus(
		order,
		orderStatus
	)

	const timeBasedItemParams = {
		startTime: sanitizedOrder.parameters.startTime,
		endTime: sanitizedOrder.parameters.endTime,
		currentBlockTimestamp,
		ascendingAmountTimestampBuffer: 300,
	}

	const tipConsiderationItems = tips.map((tip) => ({
		...mapInputItemToOfferItem(tip),
		recipient: tip.recipient,
	}))

	const isRecipientSelf = recipientAddress === ZERO_ADDRESS

	// We use basic fulfills as they are more optimal for simple and "hot" use cases
	// We cannot use basic fulfill if user is trying to partially fill though.
	if (
		!unitsToFill &&
    isRecipientSelf &&
    shouldUseBasicFulfill(sanitizedOrder.parameters, totalFilled)
	) {
		// TODO: Use fulfiller proxy if there are approvals needed directly, but none needed for proxy
		return fulfillBasicOrder({
			order: sanitizedOrder,
			seaportContract: contract,
			offererBalancesAndApprovals,
			fulfillerBalancesAndApprovals,
			timeBasedItemParams,
			conduitKey,
			offererOperator,
			fulfillerOperator,
			signer: fulfiller,
			tips: tipConsiderationItems,
		})
	}

	return fulfillStandardOrder({
		order: sanitizedOrder,
		unitsToFill,
		totalFilled,
		totalSize: totalSize.eq(0)
			? getMaximumSizeForOrder(sanitizedOrder)
			: totalSize,
		offerCriteria,
		considerationCriteria,
		tips: tipConsiderationItems,
		extraData,
		seaportContract: contract,
		offererBalancesAndApprovals,
		fulfillerBalancesAndApprovals,
		timeBasedItemParams,
		conduitKey,
		signer: fulfiller,
		offererOperator,
		fulfillerOperator,
		recipientAddress,
	})
}

const CROSS_CHAIN_DEFAULT_CONDUIT_KEY =
  "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000"
const CROSS_CHAIN_DEFAULT_CONDUIT =
  "0x1e0049783f008a0085193e00003d00cd54003c71"

export const CROSS_CHAIN_SEAPORT_ADDRESS =
  "0x00000000006c3852cbef3e08e8df289169ede581"

export const NO_CONDUIT =
  "0x0000000000000000000000000000000000000000000000000000000000000000"

const CONDUIT_KEYS_TO_CONDUIT: Record<string, string> = {
	[CROSS_CHAIN_DEFAULT_CONDUIT_KEY]: CROSS_CHAIN_DEFAULT_CONDUIT,
	[NO_CONDUIT]: CROSS_CHAIN_SEAPORT_ADDRESS,
}


export async function createOrder(
	provider: providers.JsonRpcProvider,
	{
		conduitKey = CROSS_CHAIN_DEFAULT_CONDUIT_KEY,
		zone = ethers.constants.AddressZero,
		startTime = Math.floor(Date.now() / 1000).toString(),
		endTime = MAX_INT.toString(),
		offer,
		consideration,
		counter,
		allowPartialFills,
		restrictedByZone,
		fees,
		salt = generateRandomSalt(),
	}: CreateOrderInput,
	accountAddress?: string
): Promise<OrderUseCase<CreateOrderAction>> {
	const signer = await provider.getSigner(accountAddress)
	const offerer = await signer.getAddress()
	const offerItems = offer.map(mapInputItemToOfferItem)
	const considerationItems = [
		...consideration.map((consideration) => ({
			...mapInputItemToOfferItem(consideration),
			recipient: consideration.recipient ?? offerer,
		})),
	]

	const multicallProvider = new multicallProviders.MulticallProvider(provider)
	const contract = new Contract(
		CROSS_CHAIN_SEAPORT_ADDRESS,
		SeaportABI,
		multicallProvider
	) as SeaportContract

	if (
		!areAllCurrenciesSame({
			offer: offerItems,
			consideration: considerationItems,
		})
	) {
		throw new Error(
			"All currency tokens in the order must be the same token"
		)
	}

	const currencies = [...offerItems, ...considerationItems].filter(
		isCurrencyItem
	)

	const totalCurrencyAmount = totalItemsAmount(currencies)

	const operator = CONDUIT_KEYS_TO_CONDUIT[conduitKey]

	const [resolvedCounter, balancesAndApprovals] = await Promise.all([
		counter ?? contract.getCounter(offerer).then((counter: any) => counter.toNumber()),
		getBalancesAndApprovals({
			owner: offerer,
			items: offerItems,
			criterias: [],
			multicallProvider: multicallProvider,
			operator,
		}),
	])

	const orderType = getOrderTypeFromOrderOptions({
		allowPartialFills,
		restrictedByZone,
	})

	const considerationItemsWithFees = [
		...deductFees(considerationItems, fees),
		...(currencies.length
			? fees?.map((fee) =>
				feeToConsiderationItem({
					fee,
					token: currencies[0].token,
					baseAmount: totalCurrencyAmount.startAmount,
					baseEndAmount: totalCurrencyAmount.endAmount,
				})
			) ?? []
			: []),
	]

	const orderParameters: OrderParameters = {
		offerer,
		zone,
		// TODO: Placeholder
		zoneHash: formatBytes32String(resolvedCounter.toString()),
		startTime,
		endTime,
		orderType,
		offer: offerItems,
		consideration: considerationItemsWithFees,
		totalOriginalConsiderationItems: considerationItemsWithFees.length,
		salt,
		conduitKey,
	}

	const checkBalancesAndApprovals = true

	const insufficientApprovals = checkBalancesAndApprovals
		? validateOfferBalancesAndApprovals({
			offer: offerItems,
			criterias: [],
			balancesAndApprovals,
			throwOnInsufficientBalances: checkBalancesAndApprovals,
			operator,
		})
		: []

	const approvalActions = checkBalancesAndApprovals
		? await getApprovalActions(insufficientApprovals, signer)
		: []

	const { chainId } = await provider.getNetwork()

	const domainData: SeaportDomainData = {
		name: SEAPORT_CONTRACT_NAME,
		version: SEAPORT_CONTRACT_VERSION,
		chainId,
		verifyingContract: contract.address,
	}

	const createOrderAction = {
		type: "create",
		getMessageToSign: () => {
			return getMessageToSign(
				domainData,
				orderParameters,
				resolvedCounter
			)
		},
		createOrder: async () => {
			const signature = await signOrder(
				provider,
				domainData,
				orderParameters,
				resolvedCounter,
				offerer
			)

			return {
				parameters: { ...orderParameters, counter: resolvedCounter },
				signature,
			}
		},
	} as const

	const actions = [...approvalActions, createOrderAction] as const

	return {
		actions,
		executeAllActions: () =>
			executeAllActions(actions) as Promise<OrderWithCounter>,
	}
}

export function getOrderTypeFromOrderOptions({
	allowPartialFills,
	restrictedByZone,
}: Pick<CreateOrderInput, "allowPartialFills" | "restrictedByZone">) {
	if (allowPartialFills) {
		return restrictedByZone
			? OrderType.PARTIAL_RESTRICTED
			: OrderType.PARTIAL_OPEN
	}

	return restrictedByZone ? OrderType.FULL_RESTRICTED : OrderType.FULL_OPEN
}

export async function getMessageToSign(
	domainData: SeaportDomainData,
	orderParameters: OrderParameters,
	counter: number
) {
	const orderComponents: OrderComponents = {
		...orderParameters,
		counter,
	}

	return JSON.stringify(
		_TypedDataEncoder.getPayload(
			domainData,
			EIP_712_ORDER_TYPE,
			orderComponents
		)
	)
}

export async function signOrder(
	provider: providers.JsonRpcProvider,
	domainData: SeaportDomainData,
	orderParameters: OrderParameters,
	counter: number,
	accountAddress?: string
): Promise<string> {
	const signer = provider.getSigner(accountAddress)

	const orderComponents: OrderComponents = {
		...orderParameters,
		counter,
	}

	const signature = await signer._signTypedData(
		domainData,
		EIP_712_ORDER_TYPE,
		orderComponents
	)

	const splittedSignature = ethers.utils.splitSignature(signature)
	return splittedSignature.r + splittedSignature._vs.substring(2)
}

export type SeaportDomainData = {
	name: string
	version: string
	chainId: number
	verifyingContract: string
}
