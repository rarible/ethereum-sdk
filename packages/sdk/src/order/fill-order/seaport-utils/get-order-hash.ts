import { ethers } from "ethers"
import type { OrderComponents } from "./types"

export function getOrderHash(orderComponents: OrderComponents): string {
	const offerItemTypeString =
    "OfferItem(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount)"
	const considerationItemTypeString =
    "ConsiderationItem(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount,address recipient)"
	const orderComponentsPartialTypeString =
    "OrderComponents(address offerer,address zone,OfferItem[] offer,ConsiderationItem[] consideration,uint8 orderType,uint256 startTime,uint256 endTime,bytes32 zoneHash,uint256 salt,bytes32 conduitKey,uint256 counter)"
	const orderTypeString = `${orderComponentsPartialTypeString}${considerationItemTypeString}${offerItemTypeString}`

	const offerItemTypeHash = ethers.utils.keccak256(
		ethers.utils.toUtf8Bytes(offerItemTypeString)
	)
	const considerationItemTypeHash = ethers.utils.keccak256(
		ethers.utils.toUtf8Bytes(considerationItemTypeString)
	)
	const orderTypeHash = ethers.utils.keccak256(
		ethers.utils.toUtf8Bytes(orderTypeString)
	)

	const offerHash = ethers.utils.keccak256(
		"0x" +
    orderComponents.offer
    	.map((offerItem) => {
    		return ethers.utils
    			.keccak256(
    				"0x" +
            [
            	offerItemTypeHash.slice(2),
            	offerItem.itemType.toString().padStart(64, "0"),
            	offerItem.token.slice(2).padStart(64, "0"),
            	ethers.BigNumber.from(offerItem.identifierOrCriteria)
            		.toHexString()
            		.slice(2)
            		.padStart(64, "0"),
            	ethers.BigNumber.from(offerItem.startAmount)
            		.toHexString()
            		.slice(2)
            		.padStart(64, "0"),
            	ethers.BigNumber.from(offerItem.endAmount)
            		.toHexString()
            		.slice(2)
            		.padStart(64, "0"),
            ].join("")
    			)
    			.slice(2)
    	})
    	.join("")
	)

	const considerationHash = ethers.utils.keccak256(
		"0x" +
    orderComponents.consideration
    	.map((considerationItem) => {
    		return ethers.utils
    			.keccak256(
    				"0x" +
            [
            	considerationItemTypeHash.slice(2),
            	considerationItem.itemType.toString().padStart(64, "0"),
            	considerationItem.token.slice(2).padStart(64, "0"),
            	ethers.BigNumber.from(
            		considerationItem.identifierOrCriteria
            	)
            		.toHexString()
            		.slice(2)
            		.padStart(64, "0"),
            	ethers.BigNumber.from(considerationItem.startAmount)
            		.toHexString()
            		.slice(2)
            		.padStart(64, "0"),
            	ethers.BigNumber.from(considerationItem.endAmount)
            		.toHexString()
            		.slice(2)
            		.padStart(64, "0"),
            	considerationItem.recipient.slice(2).padStart(64, "0"),
            ].join("")
    			)
    			.slice(2)
    	})
    	.join("")
	)

	const derivedOrderHash = ethers.utils.keccak256(
		"0x" +
    [
    	orderTypeHash.slice(2),
    	orderComponents.offerer.slice(2).padStart(64, "0"),
    	orderComponents.zone.slice(2).padStart(64, "0"),
    	offerHash.slice(2),
    	considerationHash.slice(2),
    	orderComponents.orderType.toString().padStart(64, "0"),
    	ethers.BigNumber.from(orderComponents.startTime)
    		.toHexString()
    		.slice(2)
    		.padStart(64, "0"),
    	ethers.BigNumber.from(orderComponents.endTime)
    		.toHexString()
    		.slice(2)
    		.padStart(64, "0"),
    	orderComponents.zoneHash.slice(2),
    	orderComponents.salt.slice(2).padStart(64, "0"),
    	orderComponents.conduitKey.slice(2).padStart(64, "0"),
    	ethers.BigNumber.from(orderComponents.counter)
    		.toHexString()
    		.slice(2)
    		.padStart(64, "0"),
    ].join("")
	)

	return derivedOrderHash
}
