set -e
yarn run clean
yarn run build-ethereum-provider
yarn run build-test-common
yarn run build-ethers-ethereum
yarn run build-web3-ethereum
yarn run build-sdk
