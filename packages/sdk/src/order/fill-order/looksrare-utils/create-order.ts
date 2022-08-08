import type { Address } from "@rarible/ethereum-api-client"
import { toAddress } from "@rarible/types"
import { toBn } from "@rarible/utils/build/bn"
import type Web3 from "web3"
import type { Ethereum } from "@rarible/ethereum-provider"
import { getRequiredWallet } from "../../../common/get-required-wallet"
import { waitTx } from "../../../common/wait-tx"
import { approveErc721 } from "../../approve-erc721"
import type { SendFunction } from "../../../common/send-transaction"
import { EIP712_ORDER_TYPES } from "../../eip712"
import type { MakerOrder, SupportedChainId } from "./types"
import { addressesByNetwork } from "./constants"

export async function makeSellOrder(
	ethereum: Ethereum,
	contract: Address,
	tokenId: string,
	send: SendFunction,
	exchangeAddress: Address
) {
	const provider = getRequiredWallet(ethereum)
	const signerAddress = toAddress(await provider.getFrom())
	const chainId = await provider.getChainId()
	const addresses = addressesByNetwork[chainId as SupportedChainId]
	const nonce = await (provider as any).config.web3.eth.getTransactionCount(await provider.getFrom(), "pending")

	const now = Math.floor(Date.now() / 1000)

	const protocolFees = toBn(0)
	const creatorFees = toBn(0)
	const netPriceRatio = toBn(10000).minus(protocolFees.plus(creatorFees)).toNumber()
	const minNetPriceRatio = 7500

	const makerOrder: MakerOrder = {
		isOrderAsk: true,
		signer: signerAddress,
		collection: contract,
		price: "100000000", // :warning: PRICE IS ALWAYS IN WEI :warning:
		tokenId: tokenId, // Token id is 0 if you use the STRATEGY_COLLECTION_SALE strategy
		amount: "1",
		strategy: addresses.STRATEGY_STANDARD_SALE,
		currency: addresses.WETH,
		// currency: ZERO_ADDRESS,
		nonce: nonce,
		startTime: now,
		endTime: now + 86400, // 1 day validity
		// minPercentageToAsk: Math.max(netPriceRatio, minNetPriceRatio),
		minPercentageToAsk: minNetPriceRatio,
		params: [],
	}

	await waitTx(
		approveErc721(provider, send, contract, signerAddress, toAddress(addresses.TRANSFER_MANAGER_ERC721))
	)
	return {
		...makerOrder,
		signature: await getOrderSignature(makerOrder, ethereum, exchangeAddress),
	}
}

async function getOrderSignature(order: MakerOrder, ethereum: Ethereum, exchangeContract: Address): Promise<string> {
	const provider = getRequiredWallet(ethereum)

	if (!exchangeContract) {
		throw new Error("Looksrare order cannot be signed without exchange address in config")
	}

	const domain = {
		name: "LooksRareExchange",
		version: "1",
		chainId: await ethereum.getChainId(),
		verifyingContract: exchangeContract,
	}

	const type = {
		MakerOrder: [
			{ name: "isOrderAsk", type: "bool" },
			{ name: "signer", type: "address" },
			{ name: "collection", type: "address" },
			{ name: "price", type: "uint256" },
			{ name: "tokenId", type: "uint256" },
			{ name: "amount", type: "uint256" },
			{ name: "strategy", type: "address" },
			{ name: "currency", type: "address" },
			{ name: "nonce", type: "uint256" },
			{ name: "startTime", type: "uint256" },
			{ name: "endTime", type: "uint256" },
			{ name: "minPercentageToAsk", type: "uint256" },
			{ name: "params", type: "bytes" },
		],
	}

	const signature = await provider.signTypedData({
		primaryType: "MakerOrder",
		domain,
		types: {
			...EIP712_ORDER_TYPES,
			...type,
		},
		message: {
			isOrderAsk: order.isOrderAsk,
			signer: order.signer,
			collection: order.collection,
			price: order.price,
			tokenId: order.tokenId,
			amount: order.amount,
			strategy: order.strategy,
			currency: order.currency,
			nonce: order.nonce,
			startTime: order.startTime,
			endTime: order.endTime,
			minPercentageToAsk: order.minPercentageToAsk,
			params: order.params,
		},
	})
	return signature
}
