const path = require("path")
const webpack = require("webpack")

module.exports = {
	entry: "./build/index.js",
	output: {
		path: path.resolve(__dirname, "umd"),
		filename: "rarible-web3-ethereum.js",
		library: {
			name: "raribleWeb3Ethereum",
			type: "umd",
		},
	},
	resolve: {
		fallback: {
			"stream": require.resolve("stream-browserify"),
			"Buffer": require.resolve("buffer"),
			"process": require.resolve("process/browser"),
			"crypto": require.resolve("crypto-browserify"),
			"https": require.resolve("https-browserify"),
			"http": require.resolve("stream-http"),
			"os": require.resolve("os-browserify/browser"),
		},
	},
	plugins: [
		new webpack.ProvidePlugin({
			Buffer: ["buffer", "Buffer"],
		}),
		new webpack.ProvidePlugin({
			process: "process/browser",
		}),
	],
	mode: "production",
	optimization: {
		minimize: true,
	},
}
