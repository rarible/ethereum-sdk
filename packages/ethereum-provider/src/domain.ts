export enum SignTypedDataMethodEnum {
	V4 = "eth_signTypedData_v4",
	V3 = "eth_signTypedData_v3",
	DEFAULT = "eth_signTypedData"
}

export type DomainData = {
	name: string
	version: string
	chainId: number
	verifyingContract: string
}

export type TypedSignatureData = {
	types: object
	domain: DomainData
	primaryType: string
	message: any
}
