import type { providers as multicallProviders } from "@0xsequence/multicall"
import type { ContractInterface } from "ethers"
import { BigNumber, Contract } from "ethers"
import { erc20Abi } from "../../contracts/erc20"
import { erc721Abi } from "../../contracts/erc721"
// import { ERC1155ABI } from "./abi/ERC1155"
// import { ERC20ABI } from "./abi/ERC20"
// import { ERC721ABI } from "./abi/ERC721"
import { erc1155Abi } from "../../contracts/erc1155"
import { ItemType } from "./constants"
import type { InputCriteria, Item } from "./types"
import { isErc1155Item, isErc20Item, isErc721Item } from "./item"

export const balanceOf = async (
	owner: string,
	item: Item,
	multicallProvider: multicallProviders.MulticallProvider,
	criteria?: InputCriteria
): Promise<BigNumber> => {
	if (isErc721Item(item.itemType)) {
		const contract = new Contract(
			item.token,
			erc721Abi as ContractInterface,
			multicallProvider
		)

		if (item.itemType === ItemType.ERC721_WITH_CRITERIA) {
			return criteria
				? contract
					.ownerOf(criteria.identifier)
					.then((ownerOf: string) =>
						BigNumber.from(
							Number(ownerOf.toLowerCase() === owner.toLowerCase())
						)
					)
				: contract.balanceOf(owner)
		}

		return contract
			.ownerOf(item.identifierOrCriteria)
			.then((ownerOf: string) =>
				BigNumber.from(Number(ownerOf.toLowerCase() === owner.toLowerCase()))
			)
	} else if (isErc1155Item(item.itemType)) {
		const contract = new Contract(
			item.token,
			erc1155Abi as ContractInterface,
			multicallProvider
		)

		if (item.itemType === ItemType.ERC1155_WITH_CRITERIA) {
			if (!criteria) {
				// We don't have a good way to determine the balance of an erc1155 criteria item unless explicit
				// identifiers are provided, so just assume the offerer has sufficient balance
				const startAmount = BigNumber.from(item.startAmount)
				const endAmount = BigNumber.from(item.endAmount)

				return startAmount.gt(endAmount) ? startAmount : endAmount
			}
			return contract.balanceOf(owner, criteria.identifier)
		}

		return contract.balanceOf(owner, item.identifierOrCriteria)
	}

	if (isErc20Item(item.itemType)) {
		const contract = new Contract(
			item.token,
			erc20Abi as ContractInterface,
			multicallProvider
		)
		return contract.balanceOf(owner)
	}

	return multicallProvider.getBalance(owner)
}
