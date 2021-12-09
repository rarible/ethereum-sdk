import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { Address, ConfigurationParameters, OrderForm } from "@rarible/ethereum-api-client"
import type { BigNumber } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import type { BigNumberValue } from "@rarible/utils/build/bn"
import { getEthereumConfig } from "./config"
import type { UpsertOrderAction } from "./order/upsert-order"
import { UpsertOrder } from "./order/upsert-order"
import { approve as approveTemplate } from "./order/approve"
import type { SellOrderAction, SellOrderUpdateAction } from "./order/sell"
import { OrderSell } from "./order/sell"
import { signOrder as signOrderTemplate } from "./order/sign-order"
import type { BidOrderAction, BidUpdateOrderAction} from "./order/bid"
import { OrderBid } from "./order/bid"
import * as order from "./order"
import { checkAssetType as checkAssetTypeTemplate } from "./order/check-asset-type"
import type { MintOffChainResponse, MintOnChainResponse, MintRequest } from "./nft/mint"
import { mint as mintTemplate } from "./nft/mint"
import type { TransferAsset } from "./nft/transfer"
import { transfer as transferTemplate } from "./nft/transfer"
import { signNft as signNftTemplate } from "./nft/sign-nft"
import type { BurnAsset } from "./nft/burn"
import { burn as burnTemplate } from "./nft/burn"
import type { RaribleEthereumApis } from "./common/apis"
import { createEthereumApis } from "./common/apis"
import { send as sendTemplate } from "./common/send-transaction"
import { cancel as cancelTemplate } from "./order/cancel"
import type { FillOrderAction } from "./order/fill-order/types"
import type { SimpleOrder } from "./order/types"
import { RaribleV1OrderHandler } from "./order/fill-order/rarible-v1"
import { OrderFiller } from "./order/fill-order"
import { RaribleV2OrderHandler } from "./order/fill-order/rarible-v2"
import { OpenSeaOrderHandler } from "./order/fill-order/open-sea"
import { CryptoPunksOrderHandler } from "./order/fill-order/crypto-punks"
import { getBaseOrderFee as getBaseOrderFeeTemplate } from "./order/get-base-order-fee"
import { DeployErc721 } from "./nft/deploy-erc721"
import { DeployErc1155 } from "./nft/deploy-erc1155"
import type { DeployNft } from "./common/deploy"
import type { BalanceRequestAssetType} from "./common/balances"
import { Balances } from "./common/balances"
import type { EthereumNetwork } from "./types"
import type { GetOrderFillTxData } from "./order/fill-order/types"

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
   * Get fill transaction data (for external sending)
   *
   * @param request order and parameters (amount to fill, fees etc)
   */
	getFillTxData: GetOrderFillTxData

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
	 * @param amount amount to burn
	 */
	burn(asset: BurnAsset, amount?: BigNumber): Promise<EthereumTransaction | void>

	deploy: DeployNft
}

export interface RaribleBalancesSdk {
	/**
	 * Return balance of user
	 * @param address balance owner
	 * @param assetType type of asset. Supports ERC20 and ETH
	 */
	getBalance(address: Address, assetType: BalanceRequestAssetType): Promise<BigNumberValue>
}

export interface RaribleSdk {
	order: RaribleOrderSdk
	nft: RaribleNftSdk
	apis: RaribleEthereumApis
	balances: RaribleBalancesSdk
}

// noinspection JSUnusedGlobalSymbols
export function createRaribleSdk(
	ethereum: Maybe<Ethereum>,
	env: EthereumNetwork,
	params?: ConfigurationParameters
): RaribleSdk {
	const config = getEthereumConfig(env)
	const apis = createEthereumApis(env, params)
	const send = partialCall(sendTemplate, apis.gateway)
	const checkLazyAssetType = partialCall(order.checkLazyAssetType, apis.nftItem)
	const checkLazyAsset = partialCall(order.checkLazyAsset, checkLazyAssetType)
	const checkLazyOrder = order.checkLazyOrder.bind(null, checkLazyAsset)
	const checkAssetType = partialCall(checkAssetTypeTemplate, apis.nftCollection)

	const filler = new OrderFiller(
		ethereum,
		new RaribleV1OrderHandler(ethereum, apis.order, send, config),
		new RaribleV2OrderHandler(ethereum, send, config),
		new OpenSeaOrderHandler(ethereum, send, config),
		new CryptoPunksOrderHandler(ethereum, send, config)
	)

	const upsertService = new UpsertOrder(
		filler,
		checkLazyOrder,
		partialCall(approveTemplate, ethereum, send, config.transferProxies),
		partialCall(signOrderTemplate, ethereum, config),
		apis.order,
		ethereum
	)

	const sellService = new OrderSell(upsertService, checkAssetType)
	const bidService = new OrderBid(upsertService, checkAssetType)

	return {
		apis,
		order: {
			sell: sellService.sell,
			sellUpdate: sellService.update,
			fill: filler.fill,
			getFillTxData: filler.getTransactionData,
			bid: bidService.bid,
			bidUpdate: bidService.update,
			upsert: upsertService.upsert,
			cancel: partialCall(cancelTemplate, checkLazyOrder, ethereum, config.exchange),
			getBaseOrderFee: getBaseOrderFeeTemplate.bind(null, config),
			getBaseOrderFillFee: filler.getBaseOrderFillFee,
		},
		nft: {
			mint: partialCall(
				mintTemplate,
				ethereum,
				send,
				partialCall(signNftTemplate, ethereum, config.chainId),
				apis.nftCollection,
				apis.nftLazyMint
			),
			transfer: partialCall(
				transferTemplate,
				ethereum,
				send,
				checkAssetType,
				apis.nftItem,
				apis.nftOwnership
			),
			burn: partialCall(burnTemplate, ethereum, send, checkAssetType, apis),
			deploy: {
				erc721: new DeployErc721(ethereum, send, config),
				erc1155: new DeployErc1155(ethereum, send, config),
			},
		},
		balances: new Balances(ethereum, apis.erc20Balance),
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
