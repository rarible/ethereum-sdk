const path = require("path")
const webpack = require("webpack")

module.exports = {
	entry: "./build/index.js",
	experiments: {
		outputModule: true,
	},
	output: {
		path: path.resolve(__dirname, "umd"),
		filename: "rarible-ethereum-sdk.js",
		library: {
			type: "umd",
		},
		path: path.resolve(__dirname, "esm"),
		filename: "rarible-ethereum-sdk.js",
		library: {
			type: "module",
		},
	},
	resolve: {
		fallback: {
			"stream": require.resolve("stream-browserify"),
			"buffer": require.resolve("buffer"),
			"process": require.resolve("process/browser"),
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
