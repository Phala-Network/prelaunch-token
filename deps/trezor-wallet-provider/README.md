# trezor-wallet-provider
Trezor-enabled Web3 subprovider for [metamask's provider engine](https://github.com/MetaMask/provider-engine). Use it to sign transactions with Trezor hardware wallet

## Install

```
$ npm install @daonomic/trezor-wallet-provider
```

## General Usage

You can use this subprovider to sign transaction using trezor hardware wallet.

```javascript
var engine = new ProviderEngine();
engine.addProvider(new TrezorProvider("m/44'/1'/0'/0/0"));
engine.addProvider(new FiltersSubprovider());
engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider("http://ropsten.infura.com/{key}")));
engine.start();
```

TrezorProvider will expose one address for specified path

Parameters:

- `path`: `string`. derivation path for address

## Truffle Usage

You can use this in Truffle by modifying your config as shown:

```
var TrezorWeb3Provider = require("@daonomic/trezor-web3-provider);

module.exports = {
  networks: {
    rinkeby: {
      network_id: '4',
      provider: function() { return new TrezorWeb3Provider("https://rinkeby.infura.io/[YOUR_API_KEY]", "m/44'/1'/0'/0/0") },
    },
    mainnet: {
      network_id: '1',
      provider: function() { return new TrezorWeb3Provider("https://mainnet.infura.io/[YOUR_API_KEY]", "m/44'/60'/0'/0") },
    },
  }
}
```

## Requirements
Trezor bridge must be installed.
