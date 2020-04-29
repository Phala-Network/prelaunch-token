
declare module "@daonomic/trezor-wallet-provider" {
  export class Trezor {
    constructor(path: string, chainId: number);
    initSesstion(): Promise<void>;
    getAccounts(): Promise<Array<string>>;
    signTransaction(txParams: any): Promise<string>;
    static init(path: string, chainId: number): Trezor;
  }
}
