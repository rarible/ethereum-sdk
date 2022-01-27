import type { Ethereum } from "@rarible/ethereum-provider"
import type { AssetType } from "@rarible/ethereum-api-client"
import type { Erc20AssetType, EthAssetType } from "@rarible/ethereum-api-client"
import type { Part } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import type { BigNumber } from "@rarible/types"
import { toAddress, toBigNumber } from "@rarible/types"
import type { BigNumberValue } from "@rarible/utils/build/bn"
import type { EthereumTransaction } from "@rarible/ethereum-provider"
import { Action } from "@rarible/action"
import { id } from "../common/id"
import type { EthereumConfig } from "../config/type"
import type { ApproveFunction } from "../order/approve"
import { waitTx } from "../common/wait-tx"
import { getPrice } from "../common/get-price"
import type { AssetTypeRequest, AssetTypeResponse} from "../order/check-asset-type"
import type { RaribleEthereumApis } from "../common/apis"
import { checkAssetType } from "../order/check-asset-type"
import { createEthereumAuctionContract } from "./contracts/auction"
import { AUCTION_DATA_TYPE, getAuctionHash } from "./common"

export type CreateAuctionRequest = {
	makeAssetType: AssetTypeRequest,
	amount: BigNumber,
	takeAssetType: EthAssetType | Erc20AssetType,
	minimalStepDecimal: BigNumberValue,
	minimalPriceDecimal: BigNumberValue,
	duration: number,
	startTime?: number,
	buyOutPriceDecimal: BigNumberValue,
	payouts: Part[],
	originFees: Part[],
}

export type AuctionStartAction = Action<"approve" | "sign", CreateAuctionRequest, AuctionStartResponse>
export type AuctionStartResponse = {
	tx: EthereumTransaction
	hash: Promise<string>
	auctionId: Promise<BigNumber>
}

export class StartAuction {
	private readonly checkAssetType: (asset: AssetTypeRequest) => Promise<AssetTypeResponse>
	private readonly getAuctionHash: (auctionId: BigNumber) => string

	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly config: EthereumConfig,
		private readonly approve: ApproveFunction,
		private readonly apis: RaribleEthereumApis,
	) {
		this.checkAssetType = checkAssetType.bind(null, apis.nftCollection)
		this.getAuctionHash = getAuctionHash.bind(null, this.ethereum, this.config)
	}

	readonly start: AuctionStartAction = Action.create({
		id: "approve" as const,
		run: async (request: CreateAuctionRequest) => {
			if (!this.ethereum) {
				throw new Error("Wallet is undefined")
			}
			const makeAssetType = await this.checkAssetType(request.makeAssetType)
			await waitTx(
				this.approve(
					toAddress(await this.ethereum.getFrom()),
					{
						assetType: makeAssetType,
						value: request.amount,
					},
					true
				)
			)
			return { request, makeAssetType }
		},
	})
		.thenStep({
			id: "sign" as const,
			run: async ({ request, makeAssetType }: { request: CreateAuctionRequest, makeAssetType: AssetTypeResponse}) => {
				if (!this.ethereum) {
					throw new Error("Wallet is undefined")
				}
				const sellAsset = {
					assetType: {
						assetClass: id(makeAssetType.assetClass),
						data: getAssetEncodedData(this.ethereum, makeAssetType),
					},
					value: request.amount,
				}
				const buyAssetType = {
					assetClass: id(request.takeAssetType.assetClass),
					data: getAssetEncodedData(this.ethereum, request.takeAssetType),
				}

				const data = this.ethereum.encodeParameter(AUCTION_DATA_V1, {
					payouts: request.payouts,
					originFees: request.originFees,
					duration: request.duration,
					startTime: request.startTime || 0,
					buyOutPrice: (await getPrice(this.ethereum, request.takeAssetType, request.buyOutPriceDecimal)).toString(),
				})

				const tx = await createEthereumAuctionContract(this.ethereum, this.config.auction)
					.functionCall(
						"startAuction",
						sellAsset,
						buyAssetType,
						(await getPrice(this.ethereum, request.takeAssetType, request.minimalStepDecimal)).toString(),
						(await getPrice(this.ethereum, request.takeAssetType, request.minimalPriceDecimal)).toString(),
						AUCTION_DATA_TYPE,
						data,
					)
					.send({gas: 10000000})

				const auctionIdPromise = tx.wait()
					.then(receipt => {
						const createdEvent = receipt.events.find(e => e.event === "AuctionCreated")
						if (!createdEvent) throw new Error("AuctionCreated event has not been found")
						return toBigNumber(createdEvent.args.auctionId)
					})

				const hashPromise = auctionIdPromise
					.then((auctionId) => {
						return this.getAuctionHash(auctionId)
					})

				return {
					tx,
					hash: hashPromise,
					auctionId: auctionIdPromise,
				}
			},
		})

}


const AUCTION_DATA_V1 = {
	components: [
		{
			components: [
				{
					name: "account",
					type: "address",
				},
				{
					name: "value",
					type: "uint96",
				},
			],
			name: "payouts",
			type: "tuple[]",
		},
		{
			components: [
				{
					name: "account",
					type: "address",
				},
				{
					name: "value",
					type: "uint96",
				},
			],
			name: "originFees",
			type: "tuple[]",
		},
		{
			name: "duration",
			type: "uint96",
		},
		{
			name: "startTime",
			type: "uint96",
		},
		{
			name: "buyOutPrice",
			type: "uint96",
		},
	],
	name: "data",
	type: "tuple",
}

function getAssetEncodedData(
	ethereum: Ethereum,
	asset: AssetType
): string {
	switch (asset.assetClass) {
		case "ETH": {
			return "0x"
		}
		case "ERC20": {
			return ethereum.encodeParameter("address", asset.contract)
		}
		case "ERC721":
		case "ERC1155": {
			return ethereum.encodeParameter({
				components: [
					{
						name: "contractAddress",
						type: "address",
					},
					{
						name: "tokenId",
						type: "uint256",
					},
				],
				name: "data",
				type: "tuple",
			}, {
				contractAddress: asset.contract,
				tokenId: asset.tokenId,
			})
		}
		default:
			throw new Error("Unrecognized asset for auction")
	}
}
