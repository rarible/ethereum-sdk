export interface Ethereum {
    createContract(abi: any, address?: string): EthereumContract;
}
export interface EthereumContract {
    call(name: string, ...args: any): Promise<any>;
    send(name: string, ...args: any): Promise<EthereumTransaction>;
}
export interface EthereumTransaction {
    hash: string;
    wait(): Promise<void>;
}
export interface CurrentProvider {
    sendAsync(request: {
        method: string;
        params: any[];
        signer: string;
    }, callBack: (err: any, result: any) => void): Promise<string | undefined>;
}
