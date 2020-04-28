const { Trezor } = require("@daonomic/trezor-wallet-provider");

// import "source-map-support/register";
const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require("web3-provider-engine/subproviders/filters");
const NonceSubProvider = require("web3-provider-engine/subproviders/nonce-tracker");
const HookedSubprovider = require("web3-provider-engine/subproviders/hooked-wallet");
const ProviderSubprovider = require("web3-provider-engine/subproviders/provider");
const Url = require("url");
const Web3 = require("web3");

// Important: do not use debug module. Reason: https://github.com/trufflesuite/truffle/issues/2374#issuecomment-536109086

// This line shares nonce state across multiple provider instances. Necessary
// because within truffle the wallet is repeatedly newed if it's declared in the config within a
// function, resetting nonce from tx to tx. An instance can opt out
// of this behavior by passing `shareNonce=false` to the constructor.
// See issue #65 for more
const singletonNonceSubProvider = new NonceSubProvider();

class TrezorWeb3Provider {

  constructor(provider, path, networkId, shareNonce = true) {
		this.engine = new ProviderEngine();
		this.trezor = Trezor.init(path, networkId);

    if (!TrezorWeb3Provider.isValidProvider(provider)) {
      throw new Error(
        [
          `Malformed provider URL: '${provider}'`,
          "Please specify a correct URL, using the http, https, ws, or wss protocol.",
          ""
        ].join("\n")
      );
    }

    // const tmp_accounts = this.addresses;
    // const tmp_wallets = this.wallets;

		const self = this;
    this.engine.addProvider(
      new HookedSubprovider({
        async getAccounts(cb) {
					try {
						const accounts = await self.trezor.getAccounts();
						cb(null, accounts);
					} catch (error) {
						cb(error);
					}
        },
        // getPrivateKey(address, cb) {
        //   if (!tmp_wallets[address]) {
        //     return cb("Account not found");
        //   } else {
        //     cb(null, tmp_wallets[address].getPrivateKey().toString("hex"));
        //   }
        // },
        async signTransaction(txParams, cb) {
					console.log('#### signTransaction', txParams, cb);
					try {
						const tx = await self.trezor.signTransaction(txParams);
						console.log('#### signed:', tx, cb);
						cb(null, tx);
						return tx;
					} catch (error) {
						console.error('#### error:', error);
						cb(error);
					}
				},
        // signMessage({ data, from }: any, cb: any) {
        //   const dataIfExists = data;
        //   if (!dataIfExists) {
        //     cb("No data to sign");
        //   }
        //   if (!tmp_wallets[from]) {
        //     cb("Account not found");
        //   }
        //   let pkey = tmp_wallets[from].getPrivateKey();
        //   const dataBuff = EthUtil.toBuffer(dataIfExists);
        //   const msgHashBuff = EthUtil.hashPersonalMessage(dataBuff);
        //   const sig = EthUtil.ecsign(msgHashBuff, pkey);
        //   const rpcSig = EthUtil.toRpcSig(sig.v, sig.r, sig.s);
        //   cb(null, rpcSig);
        // },
        // signPersonalMessage(...args: any[]) {
        //   this.signMessage(...args);
        // }
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

  send(payload, callback) {
    return this.engine.send.call(this.engine, payload, callback);
  }

  sendAsync(payload, callback) {
    this.engine.sendAsync.call(this.engine, payload, callback);
  }

  // getAddress(idx) {
  //   if (!idx) {
  //     return this.addresses[0];
  //   } else {
  //     return this.addresses[idx];
  //   }
  // }

  // getAddresses() {
  //   return this.addresses;
  // }

  static isValidProvider(provider) {
    const validProtocols = ["http:", "https:", "ws:", "wss:"];

    if (typeof provider === "string") {
      const url = Url.parse(provider.toLowerCase());
      return !!(validProtocols.includes(url.protocol || "") && url.slashes);
    }

    return true;
  }
}


module.exports = TrezorWeb3Provider;


// module.exports = function(url, path, networkId, shareNonce = true) {
// 	const engine = new ProviderEngine();
// 	engine.addProvider(new TrezorProvider(path, networkId));

// 	!shareNonce
// 	? engine.addProvider(new NonceSubProvider())
// 	: engine.addProvider(singletonNonceSubProvider);

// 	engine.addProvider(new FiltersSubprovider());
// 	engine.addProvider(new ProviderSubprovider(
// 		new Web3.providers.HttpProvider(url, {keepAlive: false})));
// 	engine.start();
// 	return engine;
// };

