import * as EthereumApiClient from "@rarible/ethereum-api-client"
import { getApiConfig } from "../config/api-config"
import type { EthereumNetwork } from "../types"

export type RaribleEthereumApis = {
	nftItem: EthereumApiClient.NftItemControllerApi;
	nftOwnership: EthereumApiClient.NftOwnershipControllerApi;
	order: EthereumApiClient.OrderControllerApi;
	orderActivity: EthereumApiClient.OrderActivityControllerApi;
	orderSignature: EthereumApiClient.OrderSignatureControllerApi;
	nftCollection: EthereumApiClient.NftCollectionControllerApi;
	balances: EthereumApiClient.BalanceControllerApi;
	gateway: EthereumApiClient.GatewayControllerApi;
	nftLazyMint: EthereumApiClient.NftLazyMintControllerApi;
	auction: EthereumApiClient.AuctionControllerApi;
}

export function createEthereumApis(
	env: EthereumNetwork,
	params: EthereumApiClient.ConfigurationParameters = {}
): RaribleEthereumApis {
	const config = getApiConfig(env, params)
	const configuration = new EthereumApiClient.Configuration(config)
	return {
		nftItem: new EthereumApiClient.NftItemControllerApi(configuration),
		nftOwnership: new EthereumApiClient.NftOwnershipControllerApi(configuration),
		order: new EthereumApiClient.OrderControllerApi(configuration),
		orderActivity: new EthereumApiClient.OrderActivityControllerApi(configuration),
		orderSignature: new EthereumApiClient.OrderSignatureControllerApi(configuration),
		nftCollection: new EthereumApiClient.NftCollectionControllerApi(configuration),
		balances: new EthereumApiClient.BalanceControllerApi(configuration),
		gateway: new EthereumApiClient.GatewayControllerApi(configuration),
		nftLazyMint: new EthereumApiClient.NftLazyMintControllerApi(configuration),
		auction: new EthereumApiClient.AuctionControllerApi(configuration),
	}
}
