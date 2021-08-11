import * as ethSigUtil from "eth-sig-util"
import { Ethereum } from "../../ethereum-provider"

export async function testPersonalSign(ethereum: Ethereum) {
	const [account] = await ethereum.getAccounts()
	const message = "test message"
	const signature = await ethereum.personalSign(message)
	const recovered = ethSigUtil.recoverPersonalSignature({ sig: signature, data: message })
	expect(account.toLowerCase()).toBe(recovered.toLowerCase())
}
