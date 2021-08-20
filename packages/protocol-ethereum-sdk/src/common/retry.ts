export async function retry<T>(num: number, fn: () => Promise<T>): Promise<T> {
	try {
		return await fn()
	} catch (e) {
		if (num > 0) {
			await delay(500)
			return retry(num - 1, fn)
		} else {
			return Promise.reject(e)
		}
	}
}

function delay(time: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve()
		}, time)
	})
}
