import {
	Address,
	Asset,
	Binary,
	Configuration,
	ConfigurationParameters,
	GatewayControllerApi,
	NftCollectionControllerApi,
	NftItem,
	NftItemControllerApi,
	NftLazyMintControllerApi,
	NftOwnershipControllerApi,
	Order,
	OrderActivityControllerApi,
	OrderControllerApi,
} from "@rarible/protocol-api-client"
import { Action } from "@rarible/action"
import { Ethereum } from "@rarible/ethereum-provider"
import { CONFIGS } from "./config"
import { UpserOrderStageId, upsertOrder as upsertOrderTemplate } from "./order/upsert-order"
import { approve as approveTemplate } from "./order/approve"
import { sell as sellTemplate, SellRequest } from "./order/sell"
import { signOrder as signOrderTemplate, SimpleOrder } from "./order/sign-order"
import { fillOrder, FillOrderRequest, FillOrderStageId } from "./order/fill-order"
import { createPendingLogs, sendTransaction } from "./common/send-transaction"
import { bid as bidTemplate, BidRequest } from "./order/bid"
import {
	checkLazyAsset as checkLazyAssetTemplate,
	checkLazyAssetType as checkLazyAssetTypeTemplate,
	checkLazyOrder as checkLazyOrderTemplate,
} from "./order"
import { checkAssetType as checkAssetTypeTemplate } from "./order/check-asset-type"
import { mintLazy as mintLazyTemplate, MintLazyRequest } from "./nft/mint-lazy"
import { signNft as signNftTemplate } from "./nft/sign-nft"

export interface RaribleSdk {
	order: RaribleOrderSdk

	nft: RaribleNftSdk

	/**
	 * Checks if approval is needed and executes approve transaction
	 * @param owner - owner of the asset
	 * @param asset - asset needed to be checked (ERC-20, ERC-721 etc are supported)
	 * @param infinite - only valid for ERC-20 (if true, then infinite approval is used)
	 */
	approve(owner: Address, asset: Asset, infinite?: (boolean | undefined)): Promise<string | undefined>

	apis: RaribleApis
}

export interface RaribleApis {
	nftItem: NftItemControllerApi
	nftOwnership: NftOwnershipControllerApi,
	order: OrderControllerApi,
	orderActivity: OrderActivityControllerApi,
	nftCollection: NftCollectionControllerApi
}

export interface RaribleOrderSdk {
	/**
	 * Sell asset (create off-chain order and check if approval is needed)
	 */
	sell(request: SellRequest): Promise<Action<UpserOrderStageId, [(string | undefined), Binary, Order]>>

	/**
	 * Create bid (create off-chain order and check if approval is needed)
	 */
	bid(request: BidRequest): Promise<Action<UpserOrderStageId, [(string | undefined), Binary, Order]>>

	/**
	 * Fill order (buy or accept bid - depending on the order type)
	 *
	 * @param order order to fill
	 * @param request parameters - what amount
	 */
	fill(order: SimpleOrder, request: FillOrderRequest): Promise<Action<FillOrderStageId, [(string | undefined), string]>>
}

export interface RaribleNftSdk {
	/**
	 *
	 * @param request parameters for item to mint
	 */
	mintLazy(request: MintLazyRequest): Promise<NftItem>
}

export function createRaribleSdk(
	ethereum: Ethereum,
	env: keyof typeof CONFIGS,
	configurationParameters?: ConfigurationParameters,
): RaribleSdk {

	const config = CONFIGS[env]
	const apiConfiguration = new Configuration({ ...configurationParameters, basePath: config.basePath })

	const nftItemControllerApi = new NftItemControllerApi(apiConfiguration)
	const nftOwnershipControllerApi = new NftOwnershipControllerApi(apiConfiguration)
	const nftCollectionControllerApi = new NftCollectionControllerApi(apiConfiguration)
	const nftLazyMintControllerApi = new NftLazyMintControllerApi(apiConfiguration)
	const orderControllerApi = new OrderControllerApi(apiConfiguration)
	const orderActivitiesControllerApi = new OrderActivityControllerApi(apiConfiguration)
	const gatewayControllerApi = new GatewayControllerApi(apiConfiguration)

	const notify = createPendingLogs.bind(null, gatewayControllerApi, ethereum)

	const sendTx = partialCall(sendTransaction, async hash => {
		await notify(hash)
	})

	const checkLazyAssetType = partialCall(checkLazyAssetTypeTemplate, nftItemControllerApi)
	const checkLazyAsset = partialCall(checkLazyAssetTemplate, checkLazyAssetType)
	const checkLazyOrder = partialCall(checkLazyOrderTemplate, checkLazyAsset)

	const checkAssetType = partialCall(checkAssetTypeTemplate, nftItemControllerApi, nftCollectionControllerApi)

	const approve = partialCall(approveTemplate, ethereum, config.transferProxies)
	const signOrder = partialCall(signOrderTemplate, ethereum, config)
	const upsertOrder = partialCall(upsertOrderTemplate, checkLazyOrder, approve, signOrder, orderControllerApi, nftItemControllerApi)
	const sell = partialCall(sellTemplate, nftItemControllerApi, upsertOrder, checkAssetType)
	const bid = partialCall(bidTemplate, nftItemControllerApi, upsertOrder, checkAssetType)
	const fill = partialCall(fillOrder, ethereum, approve, config.exchange)

	const signNft = partialCall(signNftTemplate, ethereum, config.chainId)
	const mintLazy = partialCall(mintLazyTemplate, ethereum, signNft, nftCollectionControllerApi, nftLazyMintControllerApi)

	return {
		apis: {
			nftItem: nftItemControllerApi,
			nftOwnership: nftOwnershipControllerApi,
			order: orderControllerApi,
			orderActivity: orderActivitiesControllerApi,
			nftCollection: nftCollectionControllerApi,
		},
		approve,
		order: {
			sell,
			fill,
			bid,
		},
		nft: {
			mintLazy,
		},
	}
}

type Arr = readonly unknown[];

function partialCall<T extends Arr, U extends Arr, R>(f: (...args: [...T, ...U]) => R, ...headArgs: T) {
	return (...tailArgs: U) => f(...headArgs, ...tailArgs)
}
