import {
	Address,
	Configuration,
	ConfigurationParameters,
	Erc1155AssetType,
	Erc721AssetType,
	NftCollectionControllerApi,
	NftItemControllerApi,
	NftLazyMintControllerApi,
	NftOwnershipControllerApi,
	OrderActivityControllerApi,
	OrderControllerApi,
	OrderForm
} from "@rarible/protocol-api-client"
import { Ethereum } from "@rarible/ethereum-provider"
import { BigNumber } from "@rarible/types"
import { CONFIGS } from "./config"
import { upsertOrder as upsertOrderTemplate, UpsertOrderAction } from "./order/upsert-order"
import { approve as approveTemplate } from "./order/approve"
import { sell as sellTemplate, SellRequest } from "./order/sell"
import { signOrder as signOrderTemplate, SimpleOrder } from "./order/sign-order"
import { fillOrder, FillOrderAction, FillOrderRequest } from "./order/fill-order"
import { bid as bidTemplate, BidRequest } from "./order/bid"
import {
	checkLazyAsset as checkLazyAssetTemplate,
	checkLazyAssetType as checkLazyAssetTypeTemplate,
	checkLazyOrder as checkLazyOrderTemplate
} from "./order"
import { checkAssetType as checkAssetTypeTemplate } from "./order/check-asset-type"
import { mint as mintTemplate, MintRequest } from "./nft/mint"
import { transfer as transferTemplate, TransferAsset } from "./nft/transfer"
import { signNft as signNftTemplate } from "./nft/sign-nft"
import { getMakeFee as getMakeFeeTemplate } from "./order/get-make-fee"
import { burn as burnTemplate } from "./nft/burn"

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
	 * @param order order to fill
	 * @param request parameters - what amount
	 */
	fill(order: SimpleOrder, request: FillOrderRequest): Promise<FillOrderAction>

	/**
	 *
	 * @param order order to upsert
	 * @param infinite is infinite
	 */
	upsertOrder(order: OrderForm, infinite: boolean): Promise<UpsertOrderAction>
}

export interface RaribleNftSdk {
	/**
	 *
	 * @param request parameters for item to mint
	 */
	mint(request: MintRequest): Promise<string>

	/**
	 * @param asset asset for transfer
	 * @param to recipient address
	 * @param amount for transfer
	 */
	transfer(asset: TransferAsset, to: Address, amount?: BigNumber): Promise<string | undefined>

	/**
	 * @param asset asset to burn
	 * @param amount amount to burn for Erc1155 token
	 */
	burn(asset: Erc721AssetType | Erc1155AssetType, amount?: number): Promise<string>
}

export interface RaribleSdk {
	order: RaribleOrderSdk

	nft: RaribleNftSdk

	apis: RaribleApis
}

export function createRaribleSdk(
	ethereum: Ethereum,
	env: keyof typeof CONFIGS,
	configurationParameters?: ConfigurationParameters
): RaribleSdk {
	const config = CONFIGS[env]
	const apiConfiguration = new Configuration({ ...configurationParameters, basePath: config.basePath })

	const nftItemControllerApi = new NftItemControllerApi(apiConfiguration)
	const nftOwnershipControllerApi = new NftOwnershipControllerApi(apiConfiguration)
	const nftCollectionControllerApi = new NftCollectionControllerApi(apiConfiguration)
	const nftLazyMintControllerApi = new NftLazyMintControllerApi(apiConfiguration)
	const orderControllerApi = new OrderControllerApi(apiConfiguration)
	const orderActivitiesControllerApi = new OrderActivityControllerApi(apiConfiguration)
	// const gatewayControllerApi = new GatewayControllerApi(apiConfiguration)

	// @ts-ignore
	// const notify = createPendingLogs.bind(null, gatewayControllerApi, ethereum)

	//todo we should notify API about pending tx
	// const sendTx = partialCall(sendTransaction, async hash => {
	// 	await notify(hash)
	// })

	const checkLazyAssetType = partialCall(checkLazyAssetTypeTemplate, nftItemControllerApi)
	const checkLazyAsset = partialCall(checkLazyAssetTemplate, checkLazyAssetType)
	const checkLazyOrder = partialCall(checkLazyOrderTemplate, checkLazyAsset)

	const checkAssetType = partialCall(checkAssetTypeTemplate, nftItemControllerApi, nftCollectionControllerApi)

	const approve = partialCall(approveTemplate, ethereum, config.transferProxies)
	const signOrder = partialCall(signOrderTemplate, ethereum, config)
	const getMakeFee = partialCall(getMakeFeeTemplate, config.fees)
	const upsertOrder = partialCall(
		upsertOrderTemplate,
		getMakeFee,
		checkLazyOrder,
		approve,
		signOrder,
		orderControllerApi
	)
	const sell = partialCall(sellTemplate, nftItemControllerApi, upsertOrder, checkAssetType)
	const bid = partialCall(bidTemplate, nftItemControllerApi, upsertOrder, checkAssetType)
	const fill = partialCall(fillOrder, getMakeFee, ethereum, orderControllerApi, approve, config.exchange)

	const signNft = partialCall(signNftTemplate, ethereum, config.chainId)
	const mint = partialCall(mintTemplate, ethereum, signNft, nftCollectionControllerApi, nftLazyMintControllerApi)
	const transfer = partialCall(
		transferTemplate, ethereum, signNft, checkAssetType, nftItemControllerApi, nftOwnershipControllerApi
	)
	const burn = partialCall(burnTemplate, ethereum, checkAssetType)

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
	isLazyErc721Collection, isLazyErc1155Collection, isLegacyErc721Collection, isLegacyErc1155Collection
} from "./nft/mint"
