const { program } = require('commander');
program.version('0.0.1');
program
    .option('-j, --job <string>', 'Job name, will be used to create database at "data/works/<job>"', 'job1')
    .option('-f, --file <string>', 'Input CSV file path (must have ADDRESSES and AMOUNTS)', 'data/job1.csv')
    .option('-g, --gas <number>', 'Gas fee in Gwei', 30);
program.parse(process.argv);

const storage = require('node-persist');
const Web3 = require('web3');
const BN = Web3.utils.BN;

const { 
    phaAddress, keys,
    provider, web3,
    Multisend, Token
} = require('./utils/common');
const loadcsv = require('./utils/loadcsv');

const jobName = program.job;
const gasPrice = web3.utils.toWei(program.gas.toString(), 'Gwei');
const fullSendList = loadcsv(program.file);

const normlizedSendList = fullSendList.map(raw => {
    const { ADDRESSES, AMOUNTS } = raw;
    delete raw.ADDRESSES;
    delete raw.AMOUNTS;
    return {
        ...raw,
        address: ADDRESSES.trim(),
        amount: AMOUNTS.trim(),
    }
}).filter(item => {
    if (!(item.address && item.amount)) {
        console.error('Bad input line:', item);
        return false;
    } else if (!web3.utils.isAddress(item.address)) {
        console.error('Bad address line:', item);
        return false;
    }
    return true;
})

function splitSendList (sendList, chunkSize = 100) {
    const chunks = []
    for (let i = 0; i < sendList.length; i += chunkSize) {
        chunks.push(sendList.slice(i, i + chunkSize));
    }
    return chunks;
}

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
    await storage.init({
        dir: `data/works/${jobName}`
    });

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
    const nonceStart = await web3.eth.getTransactionCount(address, 'pending');
    console.log(`Next nonce: ${nonceStart}`);

    // Load job state

    const sentTxIndex = await storage.get('txIndexSent');
    if (sentTxIndex !== undefined && sentTxIndex >= 0) {
        console.warn('Detected unfinished job. Be careful!');
    }

    // Check allowance

    const allowance = await Token.methods.allowance(address, Multisend.options.address).call();
    const numAllowance = web3.utils.toBN(allowance);
    console.log(`Allowance: ${web3.utils.fromWei(allowance)}`);

    let numTotalAmounts;
    if (sentTxIndex === undefined) {
        const amounts = normlizedSendList.map(({amount}) => web3.utils.toWei(amount.trim()));
        numTotalAmounts = amounts.reduce(((acc, x) => acc.add(new BN(x))), new BN(0));
    } else {
        const txes = await storage.get('txes');
        const txAmounts = txes
            .slice(sentTxIndex + 1)
            .map(tx => tx.args.amounts.reduce(((acc, cur) => acc.add(new BN(cur))), new BN(0)));
        numTotalAmounts = txAmounts.reduce(((acc, cur) => acc.add(cur)), new BN(0));
    }
    console.log(`Total allowance needed: ${web3.utils.fromWei(numTotalAmounts)}`);

    if (numAllowance.lt(numTotalAmounts)) {
        console.error(`Insufficient allowance. Needed: ${numTotalAmounts.toString()}`);
        console.error(`  node setAllowance.js --amount ${numTotalAmounts.toString()} --gas 30`);
        return;
    }

    const sendListChunks = splitSendList(normlizedSendList);

    const txJobs = sendListChunks.map((sendList, index) => {
        return (async () => {
            const [addresses, amounts] = sendListToContractArgs(sendList);
            const method = Multisend.methods.multiSendToken(Token.options.address, addresses, amounts);
            const encodedAbi = method.encodeABI();
            const estGas = (sentTxIndex === undefined || index > sentTxIndex)
                ? await method.estimateGas({from: address}) : 0;
            const numEstGasAmount = (new BN(estGas)).mul(new BN(gasPrice));
            console.log(`[Tx ${index}]`)
            console.log('  est gas:', estGas);
            console.log('  appr gas amount:', web3.utils.fromWei(numEstGasAmount));

            return {
                rawSendList: sendList,
                args: {token: Token.options.address, addresses, amounts},
                encodedAbi,
                estGas,
                numEstGasAmount,
            };
        })();
    })
    const txes = await Promise.all(txJobs);

    // Check gas fee

    const ethBalance = await web3.eth.getBalance(address);
    const numEthBalance = new BN(ethBalance);
    const numTotalGas = txes.reduce(((acc, cur) => acc.add(cur.numEstGasAmount)), new BN(0));
    const numLooseGas = numTotalGas.muln(3).divn(2);
    console.log(`Sender ETH balance: ${web3.utils.fromWei(numEthBalance)}`);
    console.log(`Gas fee: ${web3.utils.fromWei(numTotalGas)}`);
    console.log(`Gas fee x1.5: ${web3.utils.fromWei(numLooseGas)}`);

    if (numEthBalance.lt(numTotalGas)) {
        console.error('Insufficient eth for gas');
        return;
    }
    if (numEthBalance.lt(numLooseGas)) {
        console.warn('Sufficient eth for gas, but inusfficient for 1.5x gas');
    }

    // Send

    console.log(`Start sign and send tx from tx ${nonceStart}`);
    await storage.set('nonceStart', nonceStart);
    await storage.set('txes', txes);

    const jobs = [];
    for (const [index, tx] of txes.entries()) {
        if (sentTxIndex !== undefined && index <= sentTxIndex) {
            console.warn(`Skipping tx ${index} because it was sent`);
            continue;
        }
        let {token, addresses, amounts} = tx.args;
        const looseGasLimit = (tx.estGas * 1.5) | 1;
        const sentTxes = (sentTxIndex === undefined) ? 0 : sentTxIndex + 1;
        const nonce = nonceStart + index - sentTxes;
        // Confirm tx details
        const numAmountTotal = amounts.reduce(((acc, cur) => acc.add(new BN(cur))), new BN(0));
        const size = tx.rawSendList.length;
        console.log('----');
        console.log(`Sending tx ${nonce}`, {
            size,
            first: {
                to: addresses[0],
                amount: amounts[0],
                raw: tx.rawSendList[0],
            },
            last: {
                to: addresses[size - 1],
                amount: amounts[size - 1],
                raw: tx.rawSendList[size - 1],
            },
            totalAmount: web3.utils.fromWei(numAmountTotal)
        })
        // Send
        const promiEvent = Multisend.methods.multiSendToken(token, addresses, amounts).send({
            from: address,
            gasPrice,
            gas: looseGasLimit,
        });

        try {
            const hash = await new Promise((resolve, reject) => {
                promiEvent.on('transactionHash', function(hash){
                    console.log(`Broadcasted tx ${nonce}: ${hash}`);
                    resolve(hash);
                }).once('receipt', function(receipt){
                    console.log(`Got tx ${nonce} receipt`, receipt);
                    jobs.push(storage.set(`receipts.${index}`, receipt));
                }).on('error', function(error, receipt) {
                    console.error('Error occured. Terminating.');
                    console.error(error);
                    console.error(receipt);
                    reject({error, receipt});
                })
            })
            await storage.set('nonceSent', nonce);
            await storage.set('txIndexSent', index);
            await storage.set(`txhash.${index}`, hash);
        } catch (err) {
            await storage.set('lastError', err);
            return;
        }
    }

    console.log('Waiting for pending jobs');
    await Promise.all(jobs);
}


async function start() {
    try { await main(); } catch (e) { console.error(e) }
    process.exit();
}
start();
