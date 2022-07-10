import { Configuration, NftItemControllerApi } from "@rarible/ethereum-api-client"
import { toAddress, toBigNumber } from "@rarible/types"
import { checkLazyAssetType } from "./check-lazy-asset-type"
import { checkLazyAsset } from "./check-lazy-asset"

const client = new NftItemControllerApi(new Configuration({ basePath: "https://ethereum-api-dev.rarible.org" }))
const partial = checkLazyAssetType.bind(null, client)

describe.skip("checkLazyAsset", () => {
	test("if not found", async () => {
		const result = await checkLazyAsset(partial, {
			assetType: {
				assetClass: "ERC721",
				contract: toAddress("0x0000000000000000000000000000000000000001"),
				tokenId: toBigNumber("100"),
			},
			value: toBigNumber("100"),
		})
		expect(result.assetType.assetClass).toBe("ERC721")
	})
})
