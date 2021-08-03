import Web3 from "web3";
import {Binary} from "@rarible/protocol-api-client";

enum SignTypedDataTypes {
    SIGN_TYPED_DATA = "eth_signTypedData",
    SIGN_TYPED_DATA_V3 = "eth_signTypedData_v3",
    SIGN_TYPED_DATA_V4 = "eth_signTypedData_v4"
}

export async function signTypedData(web3: Web3, signer: string, data: any) {
    async function tryToSign(type: SignTypedDataTypes, data: any) {
        return await new Promise<Binary>((resolve, reject) => {
            function cb(err: any, result: any) {
                if (err) return reject(err);
                if (result.error) return reject(result.error);
                resolve(result.result);
            }
            // @ts-ignore
            return web3.currentProvider.sendAsync({
                method: type,
                params: [signer, data],
                signer
            }, cb);
        })
    }

    try {
        return await tryToSign(SignTypedDataTypes.SIGN_TYPED_DATA_V4, JSON.stringify(data))
    } catch(error) {
        try {
            return await tryToSign(SignTypedDataTypes.SIGN_TYPED_DATA_V3, data)
        } catch (error) {
            try {
                return await tryToSign(SignTypedDataTypes.SIGN_TYPED_DATA, data)
            } catch (error) {
                return await new Promise<Binary>((resolve, reject) => {
                    reject(error)
                })
            }
        }
    }

}
