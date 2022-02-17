import type { Address } from "@rarible/types"
import type { Ethereum } from "@rarible/ethereum-provider"
import type {
	Erc20AssetType,
	EthAssetType,
} from "@rarible/ethereum-api-client/build/models/AssetType"
import type { BigNumberValue } from "@rarible/utils"
import { BigNumber, toBn } from "@rarible/utils"
import type { Maybe } from "@rarible/types/build/maybe"
import type { RaribleEthereumApis } from "./apis"

export type BalanceRequestAssetType = EthAssetType | Erc20AssetType

export class Balances {
	constructor(
		private readonly ethereum: Maybe<Ethereum>,
		private readonly apis: RaribleEthereumApis,
		private readonly checkWalletChainId: () => Promise<boolean>,
	) {
		this.getBalance = this.getBalance.bind(this)
	}

	async getBalance(address: Address, assetType: BalanceRequestAssetType): Promise<BigNumberValue> {
		await this.checkWalletChainId()
		switch (assetType.assetClass) {
			case "ETH": {
				if (!this.ethereum) {
					throw new Error("Wallet is undefined")
				}
				const ethBalance = await this.apis.balances.getEthBalance({owner: address})
				return toBn(ethBalance.decimalBalance)
					.div(new BigNumber(10).pow(18))
			}
			case "ERC20": {
				const balance = await this.apis.balances.getErc20Balance({
					contract: assetType.contract,
					owner: address,
				})
				return toBn(balance.decimalBalance)
			}
			default: throw new Error("Asset class is not supported")
		}
	}
}
