interface Action {
	name: string
	value: () => Promise<void>
}
