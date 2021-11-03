import { Address } from "@rarible/types"
import { Ethereum } from "@rarible/ethereum-provider"
import {
	Erc20AssetType,
	EthAssetType,
} from "@rarible/ethereum-api-client/build/models/AssetType"
import { Erc20BalanceControllerApi } from "@rarible/ethereum-api-client"
import { BigNumberValue, toBn } from "@rarible/utils"
import { Maybe } from "./maybe"

export type BalanceRequestAssetType = EthAssetType | Erc20AssetType

export class Balances {
	constructor(
		private ethereum: Maybe<Ethereum>,
		private erc20BalanceController: Erc20BalanceControllerApi
	) {
		this.getBalance = this.getBalance.bind(this)
	}

	async getBalance(address: Address, assetType: BalanceRequestAssetType): Promise<BigNumberValue> {
		switch (assetType.assetClass) {
			case "ETH": {
				if (!this.ethereum) {
					throw new Error("Wallet is undefined")
				}
				return toBn(await this.ethereum.getBalance(address))
			}
			case "ERC20": {
				const balance = await this.erc20BalanceController.getErc20Balance({
					contract: assetType.contract,
					owner: address,
				})
				return toBn(balance.decimalBalance)
			}
			default: throw new Error("Asset class is not supported")
		}
	}
}
