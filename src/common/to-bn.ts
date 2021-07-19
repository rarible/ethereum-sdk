import BN from "bignumber.js"

export function toBn(number: BN.Value, base?: number) {
	return new BN(number, base)
}
