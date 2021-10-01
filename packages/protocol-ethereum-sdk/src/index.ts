import { Address, Configuration, ConfigurationParameters, GatewayControllerApi, NftCollectionControllerApi, NftItemControllerApi, NftLazyMintControllerApi, NftOwnershipControllerApi, OrderActivityControllerApi, OrderControllerApi, OrderForm } from "@rarible/protocol-api-client"
import { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { getBaseOrderFee } from "./order/get-base-order-fee"
import { getBaseOrderFillFee } from "./order/get-base-order-fill-fee"
import { CONFIGS } from "./config"
import { upsertOrder as upsertOrderTemplate, UpsertOrderAction } from "./order/upsert-order"
import { approve as approveTemplate } from "./order/approve"
import { sell as sellTemplate, SellRequest } from "./order/sell"
import { signOrder as signOrderTemplate, SimpleOrder } from "./order/sign-order"
import { fillOrder, FillOrderAction, FillOrderRequest } from "./order/fill-order"
import { bid as bidTemplate, BidRequest } from "./order/bid"
import { checkLazyAsset as checkLazyAssetTemplate, checkLazyAssetType as checkLazyAssetTypeTemplate, checkLazyOrder as checkLazyOrderTemplate } from "./order"
import { checkAssetType as checkAssetTypeTemplate } from "./order/check-asset-type"
import { mint as mintTemplate, MintOffChainResponse, MintOnChainResponse, MintRequest } from "./nft/mint"
import { transfer as transferTemplate, TransferAsset } from "./nft/transfer"
import { signNft as signNftTemplate } from "./nft/sign-nft"
import { getMakeFee as getMakeFeeTemplate } from "./order/get-make-fee"
import { burn as burnTemplate, BurnAsset } from "./nft/burn"
import { send as sendTemplate } from "./common/send-transaction"
import { cancel as cancelTemplate } from "./order/cancel"

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
	sell(request: SellRequest): Promise<UpsertOrderAction>

	/**
	 * Create bid (create off-chain order and check if approval is needed)
	 */
	bid(request: BidRequest): Promise<UpsertOrderAction>

	/**
	 * Fill order (buy or accept bid - depending on the order type)
	 *
	 * @param request order and parameters (amount to fill, fees etc)
	 */
	fill(request: FillOrderRequest): Promise<FillOrderAction>

	/**
	 * Sell or create bid. Low-level method
	 */
	upsertOrder(order: OrderForm, infinite?: (boolean | undefined)): Promise<UpsertOrderAction>

	/**
	 * Get base fee (this fee will be hold by the processing platform - in basis points)
	 */
	getBaseOrderFee(order: OrderForm): Promise<number>

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
}

export interface RaribleSdk {
	order: RaribleOrderSdk
	nft: RaribleNftSdk
	apis: RaribleApis
}

export function createRaribleSdk(
	ethereum: Ethereum, env: keyof typeof CONFIGS, configurationParameters?: ConfigurationParameters,
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
	const checkLazyOrder = partialCall(checkLazyOrderTemplate, checkLazyAsset)
	const checkAssetType = partialCall(checkAssetTypeTemplate, nftCollectionControllerApi)

	const approve = partialCall(approveTemplate, ethereum, send, config.transferProxies)
	const signOrder = partialCall(signOrderTemplate, ethereum, config)
	const getMakeFee = partialCall(getMakeFeeTemplate, config.fees)
	const upsertOrder = partialCall(
		upsertOrderTemplate, getMakeFee, checkLazyOrder, approve, signOrder, orderControllerApi,
	)
	const sell = partialCall(sellTemplate, nftItemControllerApi, upsertOrder, checkAssetType)
	const bid = partialCall(bidTemplate, nftItemControllerApi, upsertOrder, checkAssetType)
	const fill = partialCall(fillOrder, getMakeFee, ethereum, send, orderControllerApi, config)

	const signNft = partialCall(signNftTemplate, ethereum, config.chainId)
	const mint = partialCall(mintTemplate, ethereum, send, signNft, nftCollectionControllerApi, nftLazyMintControllerApi)
	const transfer = partialCall(
		transferTemplate, ethereum, send, checkAssetType, nftItemControllerApi, nftOwnershipControllerApi
	)
	const burn = partialCall(burnTemplate, ethereum, send, checkAssetType, nftOwnershipControllerApi)
	const cancel = partialCall(cancelTemplate, ethereum, config.exchange)

	return {
		apis: {
			nftItem: nftItemControllerApi,
			nftOwnership: nftOwnershipControllerApi,
			order: orderControllerApi,
			orderActivity: orderActivitiesControllerApi,
			nftCollection: nftCollectionControllerApi,
		},
		order: {
			sell,
			fill,
			bid,
			upsertOrder,
			cancel,
			getBaseOrderFee,
			getBaseOrderFillFee,
		},
		nft: {
			mint,
			transfer,
			burn,
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
