import {
	Address,
	Configuration,
	ConfigurationParameters,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
	NftOwnershipControllerApi,
	OrderActivityControllerApi,
	OrderControllerApi,
	OrderForm,
} from "@rarible/ethereum-api-client"
import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { CONFIGS } from "./config"
import { UpsertOrder, UpsertOrderAction } from "./order/upsert-order"
import { approve as approveTemplate } from "./order/approve"
import { OrderSell, SellOrderAction, SellOrderUpdateAction } from "./order/sell"
import { signOrder as signOrderTemplate } from "./order/sign-order"
import { BidOrderAction, BidUpdateOrderAction, OrderBid } from "./order/bid"
import {
	checkLazyAsset as checkLazyAssetTemplate,
	checkLazyAssetType as checkLazyAssetTypeTemplate,
	checkLazyOrder as checkLazyOrderTemplate,
	CheckLazyOrderPart,
} from "./order"
import { checkAssetType as checkAssetTypeTemplate } from "./order/check-asset-type"
import { mint as mintTemplate, MintOffChainResponse, MintOnChainResponse, MintRequest } from "./nft/mint"
import { transfer as transferTemplate, TransferAsset } from "./nft/transfer"
import { signNft as signNftTemplate } from "./nft/sign-nft"
import { burn as burnTemplate, BurnAsset } from "./nft/burn"
import { send as sendTemplate } from "./common/send-transaction"
import { cancel as cancelTemplate } from "./order/cancel"
import { FillOrderAction } from "./order/fill-order/types"
import { SimpleOrder } from "./order/types"
import { RaribleV1OrderHandler } from "./order/fill-order/rarible-v1"
import { OrderFiller } from "./order/fill-order"
import { RaribleV2OrderHandler } from "./order/fill-order/rarible-v2"
import { OpenSeaOrderHandler } from "./order/fill-order/open-sea"
import { CryptoPunksOrderHandler } from "./order/fill-order/crypto-punks"
import { getBaseOrderFee as getBaseOrderFeeTemplate } from "./order/get-base-order-fee"
import { DeployErc721 } from "./nft/deploy-erc721"
import { DeployErc1155 } from "./nft/deploy-erc1155"
import { DeployNft } from "./common/deploy"
import { Maybe } from "./common/maybe"
import { BalanceRequestAssetType, Balances } from "./common/balances"

export interface RaribleApis {
	nftItem: NftItemControllerApi
	nftOwnership: NftOwnershipControllerApi
	order: OrderControllerApi
	orderActivity: OrderActivityControllerApi
	nftCollection: NftCollectionControllerApi
}

export interface RaribleOrderSdk {
	/**
	 * Sell asset (create off-chain order and check if approval is needed)
	 */
	sell: SellOrderAction

	/**
	 * Update price in existing sell order (with approval checking)
	 */
	sellUpdate: SellOrderUpdateAction

	/**
	 * Create bid (create off-chain order and check if approval is needed)
	 */
	bid: BidOrderAction

	/**
	 * Update price in existing bid order (with approval checking)
	 */
	bidUpdate: BidUpdateOrderAction

	/**
	 * Fill order (buy or accept bid - depending on the order type)
	 *
	 * @param request order and parameters (amount to fill, fees etc)
	 */
	fill: FillOrderAction

	/**
	 * Sell or create bid. Low-level method
	 */
	upsert: UpsertOrderAction

	/**
	 * Get base fee (this fee will be hold by the processing platform - in basis points)
	 */
	getBaseOrderFee(type?: OrderForm["type"]): Promise<number>

	/**
	 * Get base fee for filling an order (this fee will be hold by the processing platform - in basis points)
	 */
	getBaseOrderFillFee(order: SimpleOrder): Promise<number>

	/**
	 * Cancel order
	 */
	cancel(order: SimpleOrder): Promise<EthereumTransaction>
}

export interface RaribleNftSdk {
	/**
	 *
	 * @param request parameters for item to mint
	 */
	mint(request: MintRequest): Promise<MintOnChainResponse | MintOffChainResponse>

	/**
	 * @param asset asset for transfer
	 * @param to recipient address
	 * @param amount for transfer
	 */
	transfer(asset: TransferAsset, to: Address, amount?: BigNumber): Promise<EthereumTransaction>

	/**
	 * @param asset asset to burn
	 * @param amount amount to burn for Erc1155 token
	 */
	burn(asset: BurnAsset, amount?: BigNumber): Promise<EthereumTransaction>

	deploy: DeployNft
}

export interface RaribleBalancesSdk {
	getBalance(address: Address, assetType: BalanceRequestAssetType): Promise<BigNumber>
}

export interface RaribleSdk {
	order: RaribleOrderSdk
	nft: RaribleNftSdk
	apis: RaribleApis
	balances: RaribleBalancesSdk
}

// noinspection JSUnusedGlobalSymbols
export function createRaribleSdk(
	ethereum: Maybe<Ethereum>, env: keyof typeof CONFIGS, configurationParameters?: ConfigurationParameters,
): RaribleSdk {
	const config = CONFIGS[env]
	const apiConfiguration = new Configuration({
		...configurationParameters,
		basePath: config.basePath,
	})

	const nftItemControllerApi = new NftItemControllerApi(apiConfiguration)
	const nftOwnershipControllerApi = new NftOwnershipControllerApi(apiConfiguration)
	const nftCollectionControllerApi = new NftCollectionControllerApi(apiConfiguration)
	const nftLazyMintControllerApi = new NftLazyMintControllerApi(apiConfiguration)
	const orderControllerApi = new OrderControllerApi(apiConfiguration)
	const orderActivitiesControllerApi = new OrderActivityControllerApi(apiConfiguration)
	const gatewayControllerApi = new GatewayControllerApi(apiConfiguration)

	const send = partialCall(sendTemplate, gatewayControllerApi)

	const checkLazyAssetType = partialCall(checkLazyAssetTypeTemplate, nftItemControllerApi)
	const checkLazyAsset = partialCall(checkLazyAssetTemplate, checkLazyAssetType)
	const checkLazyOrder: <T extends CheckLazyOrderPart>(form: T) => Promise<T> =
		checkLazyOrderTemplate.bind(null, checkLazyAsset) as any
	const checkAssetType = partialCall(checkAssetTypeTemplate, nftCollectionControllerApi)

	const filler = new OrderFiller(
		ethereum,
		new RaribleV1OrderHandler(ethereum, orderControllerApi, send, config),
		new RaribleV2OrderHandler(ethereum, send, config),
		new OpenSeaOrderHandler(ethereum, send, config),
		new CryptoPunksOrderHandler(ethereum, send, config)
	)

	const approve = partialCall(approveTemplate, ethereum, send, config.transferProxies)
	const signOrder = partialCall(signOrderTemplate, ethereum, config)

	const upsertService = new UpsertOrder(
		filler,
		checkLazyOrder,
		approve,
		signOrder,
		orderControllerApi,
		ethereum
	)

	const sellService = new OrderSell(upsertService, checkAssetType)
	const bidService = new OrderBid(upsertService, checkAssetType)

	const signNft = partialCall(signNftTemplate, ethereum, config.chainId)
	const mint = partialCall(mintTemplate, ethereum, send, signNft, nftCollectionControllerApi, nftLazyMintControllerApi)
	const transfer = partialCall(
		transferTemplate, ethereum, send, checkAssetType, nftItemControllerApi, nftOwnershipControllerApi
	)
	const burn = partialCall(burnTemplate, ethereum, send, checkAssetType, nftOwnershipControllerApi)
	const cancel = partialCall(cancelTemplate, checkLazyOrder, ethereum, config.exchange)
	const getBaseOrderFee = getBaseOrderFeeTemplate.bind(null, config)

	const deployErc721 = new DeployErc721(ethereum, send, config)
	const deployErc1155 = new DeployErc1155(ethereum, send, config)
	const balances = new Balances(ethereum, nftItemControllerApi)

	return {
		apis: {
			nftItem: nftItemControllerApi,
			nftOwnership: nftOwnershipControllerApi,
			order: orderControllerApi,
			orderActivity: orderActivitiesControllerApi,
			nftCollection: nftCollectionControllerApi,
		},
		order: {
			sell: sellService.sell,
			sellUpdate: sellService.update,
			fill: filler.fill,
			bid: bidService.bid,
			bidUpdate: bidService.update,
			upsert: upsertService.upsert,
			cancel,
			getBaseOrderFee,
			getBaseOrderFillFee: filler.getBaseOrderFillFee,
		},
		nft: {
			mint,
			transfer,
			burn,
			deploy: {
				erc721: deployErc721,
				erc1155: deployErc1155,
			},
		},
		balances: {
			getBalance: balances.getBalance,
		},
	}
}

type Arr = readonly unknown[]

function partialCall<T extends Arr, U extends Arr, R>(
	f: (...args: [...T, ...U]) => R, ...headArgs: T
): (...tailArgs: U) => R {
	return (...tailArgs: U) => f(...headArgs, ...tailArgs)
}

export {
	isErc1155v2Collection,
	isErc721v2Collection,
	isErc721v3Collection,
	isErc1155v1Collection,
	isErc721v1Collection,
} from "./nft/mint"
export * from "./order/is-nft"
export * from "./common/get-ownership-id"
export * from "./common/parse-item-id"
export * from "./common/parse-ownership-id"
