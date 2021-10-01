const path = require("path")
const webpack = require("webpack")

module.exports = {
	entry: "./build/index.js",
	output: {
		path: path.resolve(__dirname, "umd"),
		filename: "rarible-ethereum-sdk.js",
		library: {
			name: "raribleEthereumSdk",
			type: "umd",
		},
	},
	resolve: {
		fallback: {
			"stream": require.resolve("stream-browserify"),
			"buffer": require.resolve("buffer"),
		},
	},
	plugins: [
		new webpack.ProvidePlugin({
			Buffer: ["buffer", "Buffer"],
		}),
	],
	mode: "production",
	optimization: {
		minimize: true,
	},
}