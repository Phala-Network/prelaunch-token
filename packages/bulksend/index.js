const Web3 = require('web3');
// const TrezorProvider = require("@phala/trezor-provider");
const BN = Web3.utils.BN;

const { 
    phaAddress, keys,
    provider, web3,
    Multisend, Token
} = require('./utils/common');
const loadcsv = require('./utils/loadcsv');

const fullSendList = loadcsv('./data/6th-rest.csv');
const normlizedSendList = fullSendList.filter(item => {
    const { USER, ADDRESSES, AMOUNTS } = item;
    if (!(USER && ADDRESSES && AMOUNTS)) {
        console.error('Bad input line:', item);
        return false;
    }
    return true;
})

const txes = [
    {
        sendList: [
            { address: '0xb7687A5a3E7b49522705833Bf7D5bAf18AaBDD2d', amount: '123' },
            { address: '0xb7687A5a3E7b49522705833Bf7D5bAf18AaBDD2d', amount: '321' },
        ]
    }
]


function sendListToContractArgs (sendList) {
    const kZeroAddress = '0x0000000000000000000000000000000000000000';
    const kZeroAmount = '0';
    function fillArray100 (arr, defaultValue) {
        return arr.concat(Array(100 - arr.length).fill(defaultValue))
    }
    const addresses = sendList.map(({address}) => address);
    const amounts = sendList.map(({amount}) => web3.utils.toWei(amount));
    return [
        fillArray100(addresses, kZeroAddress),
        fillArray100(amounts, kZeroAmount)
    ];
}

async function main () {
    const [symbol, decimalStr] = await Promise.all([
        Token.methods.symbol().call(),
        Token.methods.decimals().call()
    ])

    console.log(`Token { symbol: ${symbol}, decimal: ${decimalStr} }`);
    if (decimalStr != '18') {
        console.error('Decimal not supportted');
        return;
    }

    const [address] = await provider.trezor.getAccounts();
    console.log(`Sender address: ${address}`);
    console.log(`Token address: ${Token.options.address}`);
    console.log(`Multisend address: ${Multisend.options.address}`);

    const allowance = await Token.methods.allowance(address, Multisend.options.address).call();
    const numAllowance = web3.utils.toBN(allowance);
    console.log(`Allowance: ${web3.utils.fromWei(allowance)}`);

    const amounts = normlizedSendList.map(({AMOUNTS}) => web3.utils.toWei(AMOUNTS.trim()));
    const numTotalAmounts = amounts.reduce(((acc, x) => acc.add(new BN(x))), new BN(0));
    console.log(`Total allowance needed: ${web3.utils.fromWei(numTotalAmounts)}`);

    if (numAllowance.lt(numTotalAmounts)) {
        console.error(`Insufficient allowance. Needed: ${numTotalAmounts.toString()}`)
        return;
    }

    // for (let tx of txes) {
    //     const [addresses, amounts] = sendListToContractArgs(tx.sendList);
    //     const method = Multisend.methods.multiSendToken(Token.options.address, addresses, amounts);
    //     const estGas = await method.estimateGas({from: address});
    //     console.log('est gas:', estGas);
    // }
}


async function start() { try { await main(); } catch (e) { console.error(e) } }
start();
