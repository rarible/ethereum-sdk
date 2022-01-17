import type { Ethereum, EthereumTransaction } from "@rarible/ethereum-provider"
import type { Address, ConfigurationParameters, OrderForm } from "@rarible/ethereum-api-client"
import type { BigNumber } from "@rarible/types"
import type { Maybe } from "@rarible/types/build/maybe"
import type { BigNumberValue } from "@rarible/utils/build/bn"
import type { AssetType } from "@rarible/ethereum-api-client"
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
import { OrderFiller } from "./order/fill-order"
import { getBaseOrderFee as getBaseOrderFeeTemplate } from "./order/get-base-order-fee"
import { DeployErc721 } from "./nft/deploy-erc721"
import { DeployErc1155 } from "./nft/deploy-erc1155"
import type { DeployNft } from "./common/deploy"
import type { BalanceRequestAssetType} from "./common/balances"
import { Balances } from "./common/balances"
import type { EthereumNetwork } from "./types"
import type { GetOrderFillTxData } from "./order/fill-order/types"
import { ConvertWeth } from "./order/convert-weth"
import { checkChainId } from "./order/check-chain-id"
import type { CreateAuctionRequest} from "./auction/start"
import { startAuction } from "./auction/start"
import { cancelAuction } from "./auction/cancel"
import { finishAuction } from "./auction/finish"
import type { PutBidRequest } from "./auction/put-bid"
import { putBid } from "./auction/put-bid"
import type { BuyOutRequest } from "./auction/buy-out"
import { buyOut } from "./auction/buy-out"

export interface RaribleOrderSdk {
	/**
	 * Sell asset (start off-chain order and check if approval is needed)
	 */
	sell: SellOrderAction

	/**
	 * Update price in existing sell order (with approval checking)
	 */
	sellUpdate: SellOrderUpdateAction

	/**
	 * Create bid (start off-chain order and check if approval is needed)
	 */
	bid: BidOrderAction

	/**
	 * Update price in existing bid order (with approval checking)
	 */
	bidUpdate: BidUpdateOrderAction

	/**
	 * Fill order (buy or accept bid - depending on the order type)
	 *
	 * @deprecated Use {@link buy} or {@link acceptBid} instead
	 * @param request order and parameters (amount to fill, fees etc)
	 */
	fill: FillOrderAction

	/**
	 * Buy order
	 *
	 * @param request order and parameters (amount to fill, fees etc)
	 */
	buy: FillOrderAction

	/**
	 * Accept bid order
	 *
	 * @param request order and parameters (amount to fill, fees etc)
	 */
	acceptBid: FillOrderAction

	/**
   * Get fill transaction data (for external sending)
   *
   * @param request order and parameters (amount to fill, fees etc)
   */
	getFillTxData: GetOrderFillTxData

	/**
	 * Sell or start bid. Low-level method
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

	/**
	 * Convert ETH balance from/to the Wrapped Ether (ERC-20) token
	 * @param from ETH or ERC20 Wrapped Ether asset type
	 * @param to ERC20 Wrapped Ether or ETH asset type
	 * @param value Value to convert
	 */
	convert(from: AssetType, to: AssetType, value: BigNumberValue): Promise<EthereumTransaction>

	/**
	 * Return address of Wrapped Ether contract (ERC-20)
	 */
	getWethContractAddress(): Address
}

export interface RaribleAuctionSdk {
	/**
   * Start new auction
   * @param request start auction request
   */
	start(request: CreateAuctionRequest): Promise<EthereumTransaction>

	/**
   * Cancel started auction
   * @param auctionId Auction ID
   */
	cancel(auctionId: BigNumber): Promise<EthereumTransaction>

	/**
   * Finish auction with at least one bid
   * @param auctionId Auction ID
   */
	finish(auctionId: BigNumber): Promise<EthereumTransaction>

	/**
   * Put bid
   * @param auctionId Auction ID
   * @param request Put bid request
   */
	putBid(auctionId: BigNumber, request: PutBidRequest): Promise<EthereumTransaction>

	/**
   * Buy out auction if it possible
   * @param auctionId Auction ID
   * @param request Buy out request
   */
	buyOut(auctionId: BigNumber, request: BuyOutRequest): Promise<EthereumTransaction>
}

export interface RaribleSdk {
	order: RaribleOrderSdk
	nft: RaribleNftSdk
	auction: RaribleAuctionSdk
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
	const checkWalletChainId = checkChainId.bind(null, ethereum, config)

	const filler = new OrderFiller(ethereum, send, config, apis)

	const approveFn = partialCall(approveTemplate, ethereum, send, config.transferProxies)

	const upsertService = new UpsertOrder(
		filler,
		checkLazyOrder,
		partialCall(approveTemplate, ethereum, send, config.transferProxies),
		partialCall(signOrderTemplate, ethereum, config),
		apis.order,
		ethereum,
		checkWalletChainId
	)

	const sellService = new OrderSell(upsertService, checkAssetType, checkWalletChainId)
	const bidService = new OrderBid(upsertService, checkAssetType, checkWalletChainId)
	const wethConverter = new ConvertWeth(ethereum, send, config)

	return {
		apis,
		order: {
			sell: sellService.sell,
			sellUpdate: sellService.update,
			fill: filler.fill,
			buy: filler.buy,
			acceptBid: filler.acceptBid,
			getFillTxData: filler.getTransactionData,
			bid: bidService.bid,
			bidUpdate: bidService.update,
			upsert: upsertService.upsert,
			cancel: partialCall(cancelTemplate, checkLazyOrder, ethereum, config.exchange, checkWalletChainId),
			getBaseOrderFee: getBaseOrderFeeTemplate.bind(null, config),
			getBaseOrderFillFee: filler.getBaseOrderFillFee,
		},
		auction: {
			start: startAuction.bind(null, ethereum, config, approveFn),
			cancel: cancelAuction.bind(null, ethereum, config),
			finish: finishAuction.bind(null, ethereum, config),
			putBid: putBid.bind(null, ethereum, config, approveFn, apis.auction),
			buyOut: buyOut.bind(null, ethereum, config, approveFn, apis.auction),
		},
		nft: {
			mint: partialCall(
				mintTemplate,
				ethereum,
				send,
				partialCall(signNftTemplate, ethereum, config.chainId),
				apis.nftCollection,
				apis.nftLazyMint,
				checkWalletChainId
			),
			transfer: partialCall(
				transferTemplate,
				ethereum,
				send,
				checkAssetType,
				apis.nftItem,
				apis.nftOwnership,
				checkWalletChainId,
			),
			burn: partialCall(burnTemplate, ethereum, send, checkAssetType, apis, checkWalletChainId),
			deploy: {
				erc721: new DeployErc721(ethereum, send, config),
				erc1155: new DeployErc1155(ethereum, send, config),
			},
		},
		balances: {
			getBalance: new Balances(ethereum, apis.erc20Balance).getBalance,
			convert: wethConverter.convert,
			getWethContractAddress: wethConverter.getWethContractAddress,
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
