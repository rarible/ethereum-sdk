import Web3 from "web3";
import { Contract } from "web3-eth-contract";
import { PromiEvent } from "web3-core";
import { Ethereum, EthereumContract, EthereumTransaction } from "@rarible/ethereum-provider";
export declare class Web3Ethereum implements Ethereum {
    private readonly web3;
    constructor(web3: Web3);
    createContract(abi: any, address?: string): EthereumContract;
}
export declare class Web3Contract implements EthereumContract {
    private readonly web3;
    private readonly contract;
    constructor(web3: Web3, contract: Contract);
    call(name: string, ...args: any): Promise<any>;
    send(name: string, ...args: any): Promise<EthereumTransaction>;
}
export declare class Web3Transaction implements EthereumTransaction {
    readonly hash: string;
    private readonly promiEvent;
    constructor(hash: string, promiEvent: PromiEvent<any>);
    wait(): Promise<void>;
}
