
export function sanitizeUri(contractPrefix: string, uriRaw: string): string {
	if (!uriRaw.startsWith(contractPrefix)) {
		throw new Error(`uri must starts with: ${contractPrefix}`)
	}
	return uriRaw.slice(contractPrefix.length) || ""
}