const Web3 = require('web3');
const TrezorProvider = require("@phala/trezor-provider");

const contract_consts = require('./contract_consts');

const phaAddress = '0x6c5ba91642f10282b576d91922ae6448c9d52f4e';
const keys = {
    api: '7725a6756780467aa76228d52591d684'
};

const provider = new TrezorProvider(
    `https://mainnet.infura.io/v3/${keys.api}`,
    1, "m/44'/60'/0'/0/5"
);
const web3 = new Web3(provider);

const Multisend = new web3.eth.Contract(
    contract_consts.bulksendContractDetails.ABI,
    contract_consts.bulksendContractDetails.contractAddress)

const Token = new web3.eth.Contract(
    contract_consts.bulksendContractDetails.TOKEN_ABI,
    phaAddress);

module.exports = {
    phaAddress, keys,
    provider, web3,
    Multisend, Token
}
