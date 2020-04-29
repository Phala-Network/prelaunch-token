'use strict';

const TrezorConnect = require('trezor-connect').default;
const { UI } = require('trezor-connect');

var HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
var Transaction = require('ethereumjs-tx').Transaction;
var bippath = require('bip32-path');

var debug = false;

function normalize(hex) {
    if (hex == null || hex === undefined) {
        return '';
    }
    if (hex.startsWith("0x")) {   
        hex = hex.substring(2);
    }
    if (hex.length % 2 != 0) {
        hex = "0" + hex;
    }
    return hex;
}

var exec = require('child_process').exec;
function execute(command) {
    return new Promise((resolve, reject) => {
        exec(command, function(error, stdout, stderr) {
            if (error != null) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
};

function buffer(hex) {
    if (hex == null) {
        return new Buffer('', 'hex');
    } else {
        return new Buffer(normalize(hex), 'hex');
    }
}

var trezorInstance;

class Trezor {
    constructor(path, chainId) {
        // this.accountsMap = {};
        // this.devices = [];
        this.path = path;
        this.address = null;
        this.initialized = this.initSession();
        this.nonce = -1;
        this.chainId = chainId;
    }

    async initSession() {
        TrezorConnect.on('UI_EVENT', async ev => {
            if (debug) {
                console.log('UI_EVENT', ev);
            }
            if (ev.type == UI.REQUEST_PIN) {
                const out = await execute("java -cp " + require.resolve("./ui-0.1.0.jar") + " io.daonomic.trezor.AskPin")
                const pin = out.trim();
                TrezorConnect.uiResponse({ type: UI.RECEIVE_PIN, payload: pin });
            } else if (!debug) {
                console.log('UI_EVENT', ev.type);
            }
        });

        await TrezorConnect.init({
            connectSrc: 'https://localhost:8088/',
            lazyLoad: true, // this param will prevent iframe injection until TrezorConnect.method will be called
            manifest: {
                email: 'hangyin@phala.network',
                appUrl: 'https://phala.network'
            },
            webusb: false
        });

        const addr = await TrezorConnect.ethereumGetAddress({path: this.path});
        await TrezorConnect.uiResponse(addr);

        if (debug) {
            console.log("Address:", addr);
        }

        this.address = addr.payload.address;
    }

    async getAccounts() {
        await this.initialized;
        return [this.address];
    }

    async signTransaction(txParams) {
        // TODO this is a hack to try to keep better track of nonces,
        // since Infura often gets out of sync, sometimes by multiple nonces.
        // It should work as long as nothing else is issuing txs from the
        // same account.
        if (this.nonce < 1 || parseInt(txParams.nonce) > this.nonce) {
            this.nonce = parseInt(txParams.nonce);
        } else {
            this.nonce += 1;
            var hexString = this.nonce.toString(16);
            txParams.nonce = "0x" + hexString;
        }

        await this.initialized;

        const result = await TrezorConnect.ethereumSignTransaction({
            path: this.path,
            transaction: {
                to: normalize(txParams.to),
                value: normalize(txParams.value),
                data: normalize(txParams.data),
                chainId: this.chainId,
                nonce: normalize(txParams.nonce),
                gasLimit: normalize(txParams.gas),
                gasPrice: normalize(txParams.gasPrice),
            }
        });

        console.log('signed:', result);
        
        const tx = new Transaction({
            nonce: buffer(txParams.nonce),
            gasPrice: buffer(txParams.gasPrice),
            gasLimit: buffer(txParams.gas),
            to: buffer(txParams.to),
            value: buffer(txParams.value),
            data: buffer(txParams.data),
            v: result.payload.v,
            r: buffer(result.payload.r),
            s: buffer(result.payload.s)
        }, {
            chain: this.chainId,
        });

        console.log('tx:', tx);
        return '0x' + tx.serialize().toString('hex');
    }

    static init(path, chainId) {
        if (trezorInstance == null) {
            trezorInstance = new Trezor(path, chainId);
        } else {
            trezorInstance.path = path;
        }
        return trezorInstance;
    }
}

class TrezorProvider extends HookedWalletSubprovider {
    constructor(path, chainId) {
        var pathArray = bippath.fromString(path).toPathArray();
        var trezor = Trezor.init(pathArray, chainId);
        super({
            getAccounts: async function(cb) {
                try {
                    const accounts = await trezor.getAccounts(cb);
                    cb(null, accounts);
                } catch (error) {
                    cb(error);
                }
            },
            signTransaction: async function(txParams, cb) {
                console.log('#### signTransaction', txParams, cb);
                try {
                    const tx = await trezor.signTransaction(txParams);
                    console.log('#### signed:', tx);
                    console.log(cb);
                    if (cb) cb(null, tx);
                    return tx;
                } catch (error) {
                    console.error('#### error:', error);
                    if (cb) cb(error);
                }
            }
        });
    }
}

module.exports = {
    TrezorProvider,
    Trezor
};

