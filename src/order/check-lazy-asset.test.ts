import { Configuration, NftItemControllerApi } from "@rarible/protocol-api-client"
import { toAddress } from "@rarible/types/build/address"
import { toBigNumber } from "@rarible/types/build/big-number"
// @ts-ignore
import FormData from "form-data"
import fetch from "node-fetch"
import { checkLazyAssetType } from "./check-lazy-asset-type"
import { checkLazyAsset } from "./check-lazy-asset"

(global as any).FormData = FormData

//@ts-ignore
const client = new NftItemControllerApi(new Configuration({ basePath: "https://api-dev.rarible.com", fetchApi: fetch }))
const partial = checkLazyAssetType.bind(null, client)

describe("checkLazyAsset", () => {
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
