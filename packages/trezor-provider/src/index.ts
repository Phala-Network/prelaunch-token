import "source-map-support/register";
import ProviderEngine from "web3-provider-engine";
import FiltersSubprovider from "web3-provider-engine/subproviders/filters";
import NonceSubProvider from "web3-provider-engine/subproviders/nonce-tracker";
import HookedSubprovider from "web3-provider-engine/subproviders/hooked-wallet";
import ProviderSubprovider from "web3-provider-engine/subproviders/provider";
import Url from "url";
import Web3 from "web3";
import { JSONRPCRequestPayload, JSONRPCErrorCallback } from "ethereum-protocol";
import { Callback, JsonRPCResponse } from "web3/providers";

import { Trezor } from "@daonomic/trezor-wallet-provider";


// Important: do not use debug module. Reason: https://github.com/trufflesuite/truffle/issues/2374#issuecomment-536109086

// This line shares nonce state across multiple provider instances. Necessary
// because within truffle the wallet is repeatedly newed if it's declared in the config within a
// function, resetting nonce from tx to tx. An instance can opt out
// of this behavior by passing `shareNonce=false` to the constructor.
// See issue #65 for more
const singletonNonceSubProvider = new NonceSubProvider();

class TrezorProvider {
  private trezor: any;
  private walletHdpath: string;
  private addresses: string[];

  public engine: ProviderEngine;

  constructor(
    provider: string | any,
    networkId: number,
    walletHdpath: string,
    shareNonce: boolean = true,
  ) {
    this.walletHdpath = walletHdpath;
    this.addresses = [];
    this.engine = new ProviderEngine();
    this.trezor = Trezor.init(walletHdpath, networkId);

    if (!TrezorProvider.isValidProvider(provider)) {
      throw new Error(
        [
          `Malformed provider URL: '${provider}'`,
          "Please specify a correct URL, using the http, https, ws, or wss protocol.",
          ""
        ].join("\n")
      );
    }

    const self = this;
    this.engine.addProvider(
      new HookedSubprovider({
        async getAccounts(cb: any) {
					try {
            const accounts = await self.trezor.getAccounts();
            self.addresses = accounts;
						cb(null, accounts);
					} catch (error) {
						cb(error);
					}
        },
        getPrivateKey(address: string, cb: any) {
          return cb("Not supported");
        },
        async signTransaction(txParams: any, cb: any) {
					console.log('#### signTransaction', txParams, cb);
					try {
						const rawTx = await self.trezor.signTransaction(txParams);
						console.log('#### signed:', rawTx, cb);
						cb(null, rawTx);
					} catch (error) {
						console.error('#### error:', error);
						cb(error);
					}
        },
        signMessage({ data, from }: any, cb: any) {
          cb("Not supported");
        },
        signPersonalMessage(...args: any[]) {
          this.signMessage(...args);
        }
      })
    );

    !shareNonce
      ? this.engine.addProvider(new NonceSubProvider())
      : this.engine.addProvider(singletonNonceSubProvider);

    this.engine.addProvider(new FiltersSubprovider());
    if (typeof provider === "string") {
      // shim Web3 to give it expected sendAsync method. Needed if web3-engine-provider upgraded!
      // Web3.providers.HttpProvider.prototype.sendAsync =
      // Web3.providers.HttpProvider.prototype.send;
      let subProvider;
      const providerProtocol = (
        Url.parse(provider).protocol || "http:"
      ).toLowerCase();

      switch (providerProtocol) {
        case "ws:":
        case "wss:":
          subProvider = new Web3.providers.WebsocketProvider(provider);
          break;
        default:
          // @ts-ignore: Incorrect typings in @types/web3
          subProvider = new Web3.providers.HttpProvider(provider, {
            keepAlive: false
          });
      }

      this.engine.addProvider(new ProviderSubprovider(subProvider));
    } else {
      this.engine.addProvider(new ProviderSubprovider(provider));
    }
    this.engine.start(); // Required by the provider engine.
  }

  public send(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    return this.engine.send.call(this.engine, payload, callback);
  }

  public sendAsync(
    payload: JSONRPCRequestPayload,
    callback: JSONRPCErrorCallback | Callback<JsonRPCResponse>
  ): void {
    this.engine.sendAsync.call(this.engine, payload, callback);
  }

  public getAddress(idx?: number): string {
    if (!idx) {
      return this.addresses[0];
    } else {
      return this.addresses[idx];
    }
  }

  public getAddresses(): string[] {
    return this.addresses;
  }

  public static isValidProvider(provider: string | any): boolean {
    const validProtocols = ["http:", "https:", "ws:", "wss:"];

    if (typeof provider === "string") {
      const url = Url.parse(provider.toLowerCase());
      return !!(validProtocols.includes(url.protocol || "") && url.slashes);
    }

    return true;
  }
}

export = TrezorProvider;
