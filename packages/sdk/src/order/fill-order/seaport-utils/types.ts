import type {
	BigNumber,
	BigNumberish,
	Contract,
	ContractTransaction,
	Overrides,
	PayableOverrides,
	PopulatedTransaction,
} from "ethers"
import type { ItemType, OrderType } from "./constants"

export type SeaportConfig = {
	// Used because fulfillments may be invalid if confirmations take too long. Default buffer is 5 minutes
	ascendingAmountFulfillmentBuffer?: number;

	// Allow users to optionally skip balance and approval checks on order creation
	balanceAndApprovalChecksOnOrderCreation?: boolean;

	// A mapping of conduit key to conduit
	conduitKeyToConduit?: Record<string, string>;

	overrides?: {
		contractAddress?: string;
		// A default conduit key to use when creating and fulfilling orders
		defaultConduitKey?: string;
	};
}

export type OfferItem = {
	itemType: ItemType;
	token: string;
	identifierOrCriteria: string;
	startAmount: string;
	endAmount: string;
}

export type ConsiderationItem = {
	itemType: ItemType;
	token: string;
	identifierOrCriteria: string;
	startAmount: string;
	endAmount: string;
	recipient: string;
}

export type Item = OfferItem | ConsiderationItem

export type OrderParameters = {
	offerer: string;
	zone: string;
	orderType: OrderType;
	startTime: BigNumberish;
	endTime: BigNumberish;
	zoneHash: string;
	salt: string;
	offer: OfferItem[];
	consideration: ConsiderationItem[];
	totalOriginalConsiderationItems: BigNumberish;
	conduitKey: string;
}

export type OrderComponents = OrderParameters & { counter: number }

export type Order = {
	parameters: OrderParameters;
	signature: string;
}

export type AdvancedOrder = Order & {
	numerator: BigNumber;
	denominator: BigNumber;
	extraData: string;
}

export type BasicErc721Item = {
	itemType: ItemType.ERC721;
	token: string;
	identifier: string;
}

export type Erc721ItemWithCriteria = {
	itemType: ItemType.ERC721;
	token: string;
	identifiers: string[];
	// Used for criteria based items i.e. offering to buy 5 NFTs for a collection
	amount?: string;
	endAmount?: string;
}

type Erc721Item = BasicErc721Item | Erc721ItemWithCriteria

export type BasicErc1155Item = {
	itemType: ItemType.ERC1155;
	token: string;
	identifier: string;
	amount: string;
	endAmount?: string;
}

export type Erc1155ItemWithCriteria = {
	itemType: ItemType.ERC1155;
	token: string;
	identifiers: string[];
	amount: string;
	endAmount?: string;
}

type Erc1155Item = BasicErc1155Item | Erc1155ItemWithCriteria

export type CurrencyItem = {
	token?: string;
	amount: string;
	endAmount?: string;
}

export type CreateInputItem = Erc721Item | Erc1155Item | CurrencyItem

export type ConsiderationInputItem = CreateInputItem & { recipient?: string }

export type TipInputItem = CreateInputItem & { recipient: string }

export type Fee = {
	recipient: string;
	basisPoints: number;
}

export type CreateOrderInput = {
	conduitKey?: string;
	zone?: string;
	startTime?: string;
	endTime?: string;
	offer: readonly CreateInputItem[];
	consideration: readonly ConsiderationInputItem[];
	counter?: number;
	fees?: readonly Fee[];
	allowPartialFills?: boolean;
	restrictedByZone?: boolean;
	useProxy?: boolean;
	salt?: string;
}

export type InputCriteria = {
	identifier: string;
	proof: string[];
}

export type OrderStatus = {
	isValidated: boolean;
	isCancelled: boolean;
	totalFilled: BigNumber;
	totalSize: BigNumber;
}

export type OrderWithCounter = {
	parameters: OrderComponents;
	signature: string;
}

export type ContractMethodReturnType<
	T extends Contract,
	U extends keyof T["callStatic"]
	// eslint-disable-next-line no-undef
> = Awaited<ReturnType<T["callStatic"][U]>>

export type TransactionMethods<T = unknown> = {
	buildTransaction: (overrides?: Overrides) => Promise<PopulatedTransaction>;
	callStatic: (overrides?: Overrides) => Promise<T>;
	estimateGas: (overrides?: Overrides) => Promise<BigNumber>;
	transact: (overrides?: Overrides) => Promise<ContractTransaction>;
}

export type ApprovalAction = {
	type: "approval";
	token: string;
	identifierOrCriteria: string;
	itemType: ItemType;
	operator: string;
	transactionMethods:
	| TransactionMethods<ContractMethodReturnType<Contract, "setApprovalForAll">>
	| TransactionMethods<ContractMethodReturnType<Contract, "approve">>;
}

export type ExchangeAction<T = unknown> = {
	type: "exchange";
	transactionMethods: TransactionMethods<T>;
}

export type CreateOrderAction = {
	type: "create";
	getMessageToSign: () => Promise<string>;
	createOrder: () => Promise<OrderWithCounter>;
}

export type TransactionAction = ApprovalAction | ExchangeAction

export type CreateOrderActions = readonly [
	...ApprovalAction[],
	CreateOrderAction
]

export type OrderExchangeActions<T> = readonly [
	...ApprovalAction[],
	ExchangeAction<T>
]

export type OrderUseCase<T extends CreateOrderAction | ExchangeAction> = {
	actions: T extends CreateOrderAction
		? CreateOrderActions
		: OrderExchangeActions<T extends ExchangeAction<infer U> ? U : never>;
	executeAllActions: () => Promise<
	T extends CreateOrderAction ? OrderWithCounter : ContractTransaction
	>;
}

export type FulfillmentComponent = {
	orderIndex: number;
	itemIndex: number;
}[]

export type Fulfillment = {
	offerComponents: FulfillmentComponent[];
	considerationComponents: FulfillmentComponent[];
}

type MatchOrdersFulfillmentComponent = {
	orderIndex: number;
	itemIndex: number;
}

export type MatchOrdersFulfillment = {
	offerComponents: MatchOrdersFulfillmentComponent[];
	considerationComponents: MatchOrdersFulfillmentComponent[];
}

// Overrides matchOrders types to fix fulfillments type which is generated
// by TypeChain incorrectly
export type SeaportContract = Contract & {
	encodeFunctionData(
		functionFragment: "matchOrders",
		values: [OrderStruct[], MatchOrdersFulfillment[]]
	): string;

	matchOrders(
		orders: OrderStruct[],
		fulfillments: MatchOrdersFulfillment[],
		overrides?: PayableOverrides & { from?: string | Promise<string> }
	): Promise<ContractTransaction>;

	functions: Contract["functions"] & {
		matchOrders(
			orders: OrderStruct[],
			fulfillments: MatchOrdersFulfillment[],
			overrides?: PayableOverrides & { from?: string | Promise<string> }
		): Promise<ContractTransaction>;
	};

	callStatic: Contract["callStatic"] & {
		matchOrders(
			orders: OrderStruct[],
			fulfillments: MatchOrdersFulfillment[],
			overrides?: PayableOverrides & { from?: string | Promise<string> }
		): Promise<ContractTransaction>;
	};

	estimateGas: Contract["estimateGas"] & {
		matchOrders(
			orders: OrderStruct[],
			fulfillments: MatchOrdersFulfillment[],
			overrides?: PayableOverrides & { from?: string | Promise<string> }
		): Promise<BigNumber>;
	};

	populateTranscation: Contract["populateTransaction"] & {
		matchOrders(
			orders: OrderStruct[],
			fulfillments: MatchOrdersFulfillment[],
			overrides?: PayableOverrides & { from?: string | Promise<string> }
		): Promise<PopulatedTransaction>;
	};
}


export type AdditionalRecipientStruct = {
	amount: BigNumberish;
	recipient: string;
}

export type AdditionalRecipientStructOutput = [BigNumber, string] & {
	amount: BigNumber;
	recipient: string;
}

export type BytesLike = ArrayLike<number> | string

export type BasicOrderParametersStruct = {
	considerationToken: string;
	considerationIdentifier: BigNumberish;
	considerationAmount: BigNumberish;
	offerer: string;
	zone: string;
	offerToken: string;
	offerIdentifier: BigNumberish;
	offerAmount: BigNumberish;
	basicOrderType: BigNumberish;
	startTime: BigNumberish;
	endTime: BigNumberish;
	zoneHash: BytesLike;
	salt: BigNumberish;
	offererConduitKey: BytesLike;
	fulfillerConduitKey: BytesLike;
	totalOriginalAdditionalRecipients: BigNumberish;
	additionalRecipients: AdditionalRecipientStruct[];
	signature: BytesLike;
}

export type FulfillmentComponentStruct = {
	orderIndex: BigNumberish;
	itemIndex: BigNumberish;
}[]

export type OrderParametersStruct = {
	offerer: string;
	zone: string;
	offer: OfferItemStruct[];
	consideration: ConsiderationItemStruct[];
	orderType: BigNumberish;
	startTime: BigNumberish;
	endTime: BigNumberish;
	zoneHash: BytesLike;
	salt: BigNumberish;
	conduitKey: BytesLike;
	totalOriginalConsiderationItems: BigNumberish;
}
export type OrderStruct = {
	parameters: OrderParametersStruct;
	signature: BytesLike;
}
export type OfferItemStruct = {
	itemType: BigNumberish;
	token: string;
	identifierOrCriteria: BigNumberish;
	startAmount: BigNumberish;
	endAmount: BigNumberish;
}
export type ConsiderationItemStruct = {
	itemType: BigNumberish;
	token: string;
	identifierOrCriteria: BigNumberish;
	startAmount: BigNumberish;
	endAmount: BigNumberish;
	recipient: string;
}
