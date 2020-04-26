const TrezorProvider = require("@daonomic/trezor-wallet-provider");
const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
const ProviderSubprovider = require("web3-provider-engine/subproviders/provider.js");
const NonceSubProvider = require("web3-provider-engine/subproviders/nonce-tracker.js");

const Web3 = require("web3");

const singletonNonceSubProvider = new NonceSubProvider();

module.exports = function(url, path, networkId, shareNonce = true) {
	const engine = new ProviderEngine();
	engine.addProvider(new TrezorProvider(path, networkId));

	!shareNonce
	? engine.addProvider(new NonceSubProvider())
	: engine.addProvider(singletonNonceSubProvider);

	engine.addProvider(new FiltersSubprovider());
	engine.addProvider(new ProviderSubprovider(
		new Web3.providers.HttpProvider(url, {keepAlive: false})));
	engine.start();
	return engine;
};

