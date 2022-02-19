const path = require("path")
const webpack = require("webpack")

module.exports = {
	entry: "./build/index.js",
	experiments: {
		outputModule: true,
	},
	output: {
		path: path.resolve(__dirname, "umd"),
		filename: "rarible-ethers-ethereum.js",
		library: {
			type: "umd",
		},
		path: path.resolve(__dirname, "esm"),
		filename: "rarible-ethers-ethereum.js",
		library: {
			type: "module",
		},
	},
	resolve: {
		fallback: {
			"stream": require.resolve("stream-browserify"),
			"process": require.resolve("process/browser"),
		},
	},
	plugins: [
		new webpack.ProvidePlugin({
			process: "process/browser",
		}),
	],
	mode: "production",
	optimization: {
		minimize: true,
	},
}
