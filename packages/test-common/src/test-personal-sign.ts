import { Ethereum } from "../../ethereum-provider"
import * as ethSigUtil from "eth-sig-util"

export async function testPersonalSign(ethereum: Ethereum) {
	const [account] = await ethereum.getSigner()
	const message = "test message"
	const signature = await ethereum.personalSign(message)
	const recovered = ethSigUtil.recoverPersonalSignature({ sig: signature, data: message })
	expect(account).toBe(recovered)
}
