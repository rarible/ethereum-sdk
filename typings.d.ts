declare type GlobalFetch = WindowOrWorkerGlobalScope
declare module "web3-provider-engine/subproviders/hooked-wallet"
declare module 'node-fetch' {
    const fetch: GlobalFetch['fetch'];
    export default fetch;
}
