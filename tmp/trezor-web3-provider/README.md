# trezor-web3-provider
Trezor-enabled Web3 provider for Truffle. Use it to sign transactions using trezor hardware wallet

## Install

```
$ npm install trezor-web3-provider
```

## General Usage

You can use this web3 provider to sign transaction using trezor hardware wallet

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

## Environment
This provider was tested successfully on Ubuntu 16.04 with the following software:

- Truffle v4.1.13 (core: 4.1.13)
- Solidity v0.4.24 (solc-js)
- NodeJS v9.11.2
- OpenJDK 1.8.0.191
- Trezor One rev 1
- Trezor FW 1.7.1 
- Trezor Bridge 2.0.25
