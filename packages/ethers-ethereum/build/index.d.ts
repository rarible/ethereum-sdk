import { Contract, Signer } from "ethers";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider";
export declare class EthersEthereum implements Ethereum {
    readonly signer: Signer;
    constructor(signer: Signer);
    createContract(abi: any, address?: string): EthereumContract;
}
export declare class EthersContract implements EthereumContract {
    private readonly contract;
    constructor(contract: Contract);
    call(name: string, ...args: any): Promise<any>;
    send(name: string, ...args: any): Promise<EthereumTransaction>;
}
export declare class EthersTransaction implements EthereumTransaction {
    private readonly tx;
    constructor(tx: TransactionResponse);
    get hash(): string;
    wait(): Promise<void>;
}
