import type { providers as multicallProviders } from "@0xsequence/multicall"
import type { ContractInterface, providers } from "ethers"
import { BigNumber, Contract } from "ethers"
import { erc20Abi } from "../../contracts/erc20"
import { erc721Abi } from "../../contracts/erc721"
import { ItemType, MAX_INT } from "./constants"
import type { ApprovalAction, Item } from "./types"
import type { InsufficientApprovals } from "./balance-and-approval-check"
import { isErc1155Item, isErc721Item } from "./item"
import { getTransactionMethods } from "./usecase"

export const approvedItemAmount = async (
	owner: string,
	item: Item,
	operator: string,
	multicallProvider: multicallProviders.MulticallProvider
) => {
	if (isErc721Item(item.itemType) || isErc1155Item(item.itemType)) {
		// isApprovedForAll check is the same for both ERC721 and ERC1155, defaulting to ERC721
		const contract = new Contract(
			item.token,
			erc721Abi as ContractInterface,
			multicallProvider
		)
		return contract.isApprovedForAll(owner, operator).then((isApprovedForAll: boolean) =>
		// Setting to the max int to consolidate types and simplify
			isApprovedForAll ? MAX_INT : BigNumber.from(0)
		)
	} else if (item.itemType === ItemType.ERC20) {
		const contract = new Contract(
			item.token,
			erc20Abi as ContractInterface,
			multicallProvider
		)

		return contract.allowance(owner, operator)
	}

	// We don't need to check approvals for native tokens
	return MAX_INT
}

/**
 * Get approval actions given a list of insufficent approvals.
 */
export function getApprovalActions(
	insufficientApprovals: InsufficientApprovals,
	signer: providers.JsonRpcSigner
): Promise<ApprovalAction[]> {
	return Promise.all(
		insufficientApprovals
			.filter(
				(approval, index) =>
					index === insufficientApprovals.length - 1 ||
          insufficientApprovals[index + 1].token !== approval.token
			)
			.map(async ({ token, operator, itemType, identifierOrCriteria }) => {
				if (isErc721Item(itemType) || isErc1155Item(itemType)) {
					// setApprovalForAll check is the same for both ERC721 and ERC1155, defaulting to ERC721
					const contract = new Contract(token, erc721Abi as ContractInterface, signer)

					return {
						type: "approval",
						token,
						identifierOrCriteria,
						itemType,
						operator,
						transactionMethods: getTransactionMethods(
							contract.connect(signer),
							"setApprovalForAll",
							[operator, true]
						),
					}
				} else {
					const contract = new Contract(token, erc20Abi as ContractInterface, signer)

					return {
						type: "approval",
						token,
						identifierOrCriteria,
						itemType,
						transactionMethods: getTransactionMethods(
							contract.connect(signer),
							"approve",
							[operator, MAX_INT]
						),
						operator,
					}
				}
			})
	)
}
