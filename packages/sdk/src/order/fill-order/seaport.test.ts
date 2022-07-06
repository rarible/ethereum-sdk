import { createE2eProvider } from "@rarible/ethereum-sdk-test-common"
import Web3 from "web3"
import { Web3Ethereum } from "@rarible/web3-ethereum"
import type { SeaportV1Order } from "@rarible/ethereum-api-client/build/models/Order"
import { ethers } from "ethers"
import { EthersWeb3ProviderEthereum } from "@rarible/ethers-ethereum"
import { toAddress } from "@rarible/types"
import { ItemType } from "@opensea/seaport-js/lib/constants"
import type { CreateInputItem } from "@opensea/seaport-js/lib/types"
import type { BigNumberValue} from "@rarible/utils/build/bn"
import { toBn } from "@rarible/utils/build/bn"
import { createRaribleSdk } from "../../index"
import { createSeaportOrder } from "../test/order-opensea"
import { createErc1155V2Collection, createErc721V3Collection } from "../../common/mint"
import { MintResponseTypeEnum } from "../../nft/mint"
import { delay } from "../../common/retry"
import { awaitOrder } from "../test/await-order"
import { awaitOwnership } from "../test/await-ownership"

describe("seaport", () => {
	const { provider: providerBuyer } = createE2eProvider("0x00120de4b1518cf1f16dc1b02f6b4a8ac29e870174cb1d8575f578480930250a", {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	})
	const { provider: providerSeller } = createE2eProvider("0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c", {
		networkId: 4,
		rpcUrl: "https://node-rinkeby.rarible.com",
	})
	const web3Seller = new Web3(providerSeller as any)
	const ethereumSeller = new Web3Ethereum({ web3: web3Seller, gas: 1000000 })
	const web3 = new Web3(providerBuyer as any)
	const ethereum = new Web3Ethereum({ web3, gas: 1000000 })

	const ethersWeb3Provider = new ethers.providers.Web3Provider(providerBuyer as any)

	const buyerEthersWeb3ProviderWallet = new EthersWeb3ProviderEthereum(ethersWeb3Provider)

	const sdkBuyer = createRaribleSdk(buyerEthersWeb3ProviderWallet, "testnet")
	const sdkSeller = createRaribleSdk(ethereumSeller, "testnet")

	const rinkebyErc721V3ContractAddress = toAddress("0x6ede7f3c26975aad32a475e1021d8f6f39c89d82")
	const rinkebyErc1155V2ContractAddress = toAddress("0x1af7a7555263f275433c6bb0b8fdcd231f89b1d7")
	const originFeeAddress = toAddress("0xe954de45ec23bF47078db77f34ef0d905F4D3051")

	test("fill order ERC-721 <-> ETH", async () => {
		const accountAddressBuyer = toAddress(await ethereum.getFrom())
		console.log("accountAddressBuyer", accountAddressBuyer)
		console.log("seller", await ethereumSeller.getFrom())

		const sellItem = await sdkSeller.nft.mint({
			collection: createErc721V3Collection(rinkebyErc721V3ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			royalties: [],
			lazy: false,
		})
		if (sellItem.type === MintResponseTypeEnum.ON_CHAIN) {
			await sellItem.transaction.wait()
		}

		await delay(10000)
		const make = {
			itemType: ItemType.ERC721,
			token: sellItem.contract,
			identifier: sellItem.tokenId,
		} as const
		const take = getOpenseaEthTakeData("10000000000")
		const orderHash = await createSeaportOrder(ethereumSeller, make, take)

		const order = await awaitOrder(sdkBuyer, orderHash)
		const tx = await sdkBuyer.order.buy({
			order: order as SeaportV1Order,
			amount: 1,
		})
		await tx.wait()
		await awaitOwnership(sdkBuyer, sellItem.itemId, accountAddressBuyer, "1")
	})

	test("fill order ERC-1155 <-> ETH", async () => {
		const accountAddress = await ethereumSeller.getFrom()
		const accountAddressBuyer = toAddress(await ethereum.getFrom())

		const sellItem = await sdkSeller.nft.mint({
			collection: createErc1155V2Collection(rinkebyErc1155V2ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			royalties: [],
			supply: 100,
			creators: [{ account: toAddress(accountAddress), value: 10000 }],
			lazy: false,
		})
		if (sellItem.type === MintResponseTypeEnum.ON_CHAIN) {
			await sellItem.transaction.wait()
		}

		await delay(10000)
		const make: CreateInputItem = {
			itemType: ItemType.ERC1155,
			token: sellItem.contract,
			identifier: sellItem.tokenId,
			amount: "10",
		} as const
		const take = getOpenseaEthTakeData("10000000000")
		const orderHash = await createSeaportOrder(ethereumSeller, make, take)

		const order = await awaitOrder(sdkBuyer, orderHash)
		const tx = await sdkBuyer.order.buy({
			order: order as SeaportV1Order,
			amount: 2,
		})
		await tx.wait()

		await awaitOwnership(sdkBuyer, sellItem.itemId, accountAddressBuyer, "2")
	})

	test("fill order ERC-1155 <-> ETH with origin fees", async () => {
		const accountAddress = await ethereumSeller.getFrom()
		const accountAddressBuyer = toAddress(await ethereum.getFrom())

		const sellItem = await sdkSeller.nft.mint({
			collection: createErc1155V2Collection(rinkebyErc1155V2ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			royalties: [],
			supply: 100,
			creators: [{ account: toAddress(accountAddress), value: 10000 }],
			lazy: false,
		})
		if (sellItem.type === MintResponseTypeEnum.ON_CHAIN) {
			await sellItem.transaction.wait()
		}

		await delay(20000)
		const make: CreateInputItem = {
			itemType: ItemType.ERC1155,
			token: sellItem.contract,
			identifier: sellItem.tokenId,
			amount: "10",
		} as const
		const take = getOpenseaEthTakeData("10000000000")

		const orderHash = await createSeaportOrder(ethereumSeller, make, take)
		const order = await awaitOrder(sdkBuyer, orderHash)

		const tx = await sdkBuyer.order.buy({
			order: order as SeaportV1Order,
			amount: 5,
			originFees: [{
				account: originFeeAddress,
				value: 1000,
			}],
		})
		await tx.wait()

		await awaitOwnership(sdkBuyer, sellItem.itemId, accountAddressBuyer, "5")
	})

	test("fill order ERC-1155 <-> ERC-20 (WETH) with origin fees", async () => {
		const accountAddress = await ethereumSeller.getFrom()
		const accountAddressBuyer = toAddress(await ethereum.getFrom())

		const sellItem = await sdkSeller.nft.mint({
			collection: createErc1155V2Collection(rinkebyErc1155V2ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			royalties: [],
			supply: 100,
			creators: [{ account: toAddress(accountAddress), value: 10000 }],
			lazy: false,
		})
		if (sellItem.type === MintResponseTypeEnum.ON_CHAIN) {
			await sellItem.transaction.wait()
		}

		await delay(20000)
		const make: CreateInputItem = {
			itemType: ItemType.ERC1155,
			token: sellItem.contract,
			identifier: sellItem.tokenId,
			amount: "10",
		} as const
		const take = getOpenseaWethTakeData("100000")

		const wethAssetType = {assetClass: "ERC20", contract: toAddress("0xc778417e063141139fce010982780140aa0cd5ab")} as const
		const feeAddressBalanceStart = await sdkSeller.balances.getBalance(originFeeAddress, wethAssetType)
		const orderHash = await createSeaportOrder(ethereumSeller, make, take)
		const order = await awaitOrder(sdkBuyer, orderHash)

		const buyerBalanceStart = await sdkSeller.balances.getBalance(accountAddressBuyer, wethAssetType)
		const tx = await sdkBuyer.order.buy({
			order: order as SeaportV1Order,
			amount: 10,
			originFees: [{
				account: originFeeAddress,
				value: 1000,
			}],
		})
		await tx.wait()

		await awaitOwnership(sdkBuyer, sellItem.itemId, accountAddressBuyer, "10")

		const buyerBalanceFinish = await sdkSeller.balances.getBalance(accountAddressBuyer, wethAssetType)
		const feeAddressBalanceFinish = await sdkSeller.balances.getBalance(originFeeAddress, wethAssetType)

		expect(toBn(feeAddressBalanceFinish).minus(feeAddressBalanceStart).toString()).toBe("0.00000000000001")
		expect(toBn(buyerBalanceStart).minus(buyerBalanceFinish).toString()).toBe("0.00000000000011")
	})

	test("fill order ERC-721 <-> ERC-20 (WETH)", async () => {
		const sellItem = await sdkSeller.nft.mint({
			collection: createErc721V3Collection(rinkebyErc721V3ContractAddress),
			uri: "ipfs://ipfs/QmfVqzkQcKR1vCNqcZkeVVy94684hyLki7QcVzd9rmjuG5",
			royalties: [],
			lazy: false,
		})
		if (sellItem.type === MintResponseTypeEnum.ON_CHAIN) {
			await sellItem.transaction.wait()
		}

		await delay(10000)
		const make = {
			itemType: ItemType.ERC721,
			token: sellItem.contract,
			identifier: sellItem.tokenId,
		} as const
		const take = getOpenseaWethTakeData("10000000000")
		const orderHash = await createSeaportOrder(ethereumSeller, make, take)

		const order = await awaitOrder(sdkBuyer, orderHash)

		const tx = await sdkBuyer.order.buy({
			order: order as SeaportV1Order,
			amount: 1,
		})
		await tx.wait()

	})
})

function getOpenseaEthTakeData(amount: BigNumberValue) {
	const sellerAmount = toBn(amount).multipliedBy("0.975")
	const feeRecipientAmount = toBn(amount).multipliedBy("0.025")
	return [
		{
			"token": "0x0000000000000000000000000000000000000000",
			"amount": sellerAmount.toString(),
			"endAmount": sellerAmount.toString(),
		},
		{
			"token": "0x0000000000000000000000000000000000000000",
			"amount": feeRecipientAmount.toString(),
			"endAmount": feeRecipientAmount.toString(),
			"recipient": "0x8de9c5a032463c561423387a9648c5c7bcc5bc90",
		},
	]
}

function getOpenseaWethTakeData(amount: BigNumberValue) {
	const weth = "0xc778417e063141139fce010982780140aa0cd5ab"
	const sellerAmount = toBn(amount).multipliedBy("0.975")
	const feeRecipientAmount = toBn(amount).multipliedBy("0.025")
	return [
		{
			"token": weth,
			"amount": sellerAmount.toString(),
			"endAmount": sellerAmount.toString(),
		},
		{
			"token": weth,
			"amount": feeRecipientAmount.toString(),
			"endAmount": feeRecipientAmount.toString(),
			"recipient": "0x8de9c5a032463c561423387a9648c5c7bcc5bc90",
		},
	]
}
