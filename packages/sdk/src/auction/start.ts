import type { Ethereum } from "@rarible/ethereum-provider"
import type { AssetType } from "@rarible/ethereum-api-client"
import type { Erc20AssetType, EthAssetType } from "@rarible/ethereum-api-client"
import type { Part } from "@rarible/ethereum-api-client"
import type { Maybe } from "@rarible/types/build/maybe"
import type { BigNumber } from "@rarible/types"
import { toAddress } from "@rarible/types"
import type { BigNumberValue } from "@rarible/utils/build/bn"
import type { EthereumTransaction } from "@rarible/ethereum-provider"
import { Action } from "@rarible/action"
import { id } from "../common/id"
import type { EthereumConfig } from "../config/type"
import type { ApproveFunction } from "../order/approve"
import { waitTx } from "../common/wait-tx"
import { getPrice } from "../common/get-price"
import { createEthereumAuctionContract } from "./contracts/auction"
import { AUCTION_DATA_TYPE } from "./common"

export type CreateAuctionRequest = {
	makeAssetType: AssetType,
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

export type AuctionStartAction = Action<"approve" | "sign", CreateAuctionRequest, EthereumTransaction>

export class StartAuction {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly config: EthereumConfig,
		private readonly approve: ApproveFunction,
	) {}

	readonly start: AuctionStartAction = Action.create({
		id: "approve" as const,
		run: async (request: CreateAuctionRequest) => {
			if (!this.ethereum) {
				throw new Error("Wallet is undefined")
			}
			await waitTx(
				this.approve(
					toAddress(await this.ethereum.getFrom()),
					{
						assetType: request.makeAssetType,
						value: request.amount,
					},
					true
				)
			)
			return request
		},
	})
		.thenStep({
			id: "sign" as const,
			run: async (request: CreateAuctionRequest) => {
				if (!this.ethereum) {
					throw new Error("Wallet is undefined")
				}
				const sellAsset = {
					assetType: {
						assetClass: id(request.makeAssetType.assetClass),
						data: getAssetEncodedData(this.ethereum, request.makeAssetType),
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

				return createEthereumAuctionContract(this.ethereum, this.config.auction)
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
