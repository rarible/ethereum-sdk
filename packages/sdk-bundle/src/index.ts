import { Web3Ethereum } from "@rarible/web3-ethereum"
import Web3 from "web3"
import { createRaribleSdk as raribleSdk } from "@rarible/protocol-ethereum-sdk"

function createRaribleSdk(web3: any, env: "e2e" | "ropsten" | "rinkeby" | "mainnet") {
	return raribleSdk(new Web3Ethereum({ web3 }), env)
}

const _global = (window || global) as any
_global.web3lib = Web3
_global.createRaribleSdk = createRaribleSdk
