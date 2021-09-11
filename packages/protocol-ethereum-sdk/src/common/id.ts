import { keccak256 } from "ethereumjs-util"

export function id(value: string): string {
	return `0x${keccak256(Buffer.from(value)).toString("hex").substring(0, 8)}`
}
