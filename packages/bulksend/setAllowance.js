const { program } = require('commander');
program.version('0.0.1');
program
    .option('-a, --amount <string>', 'Amount in fi (BN)', '10000000000000000000000')  // 10k unit
    .option('-g, --gas <number>', 'Gas fee in Gwei', 30);
program.parse(process.argv);

const { 
    phaAddress, keys,
    provider, web3,
    Multisend, Token
} = require('./utils/common');

async function main() {
    const [address] = await provider.trezor.getAccounts();
    console.log(`Sender address: ${address}`);

    const allowance = await Token.methods.allowance(address, Token.options.address).call();
    const numAllowance = web3.utils.toBN(allowance);
    console.log(`Current allowance: ${web3.utils.fromWei(allowance)}`);

    const numTargetAllowance = web3.utils.toBN(program.amount);
    const gasPriceGwei = program.gas;

    if (numAllowance.gte(numTargetAllowance)) {
        console.log(`Sufficient allowance (${numAllowance.toNumber()} >= ${numTargetAllowance.toNumber()})`);
        return;
    }

    console.log(`Trying to set allowance to: ${web3.utils.fromWei(numTargetAllowance)}`);
    await Token.methods.approve(Multisend.options.address, numTargetAllowance.toString()).send({
        from: address,
        gasPrice: web3.utils.toWei(gasPriceGwei.toString(), 'Gwei'),
    })
    .on('transactionHash', function(hash){
        console.log('transactionHash', hash);
    })
    .on('confirmation', function(confirmationNumber, receipt){
        console.log('confirmation', confirmationNumber, receipt);
    })
    .on('receipt', function(receipt){
        console.log('receipt', receipt);
    })
    .on('error', function(error, receipt) {
        // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        console.error('error', error, receipt);
    });
}

async function start() { try { await main(); } catch (e) { console.error(e) } }
start();


// > {
//     "transactionHash": "0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b",
//     "transactionIndex": 0,
//     "blockHash": "0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46",
//     "blockNumber": 3,
//     "contractAddress": "0x11f4d0A3c12e86B4b5F39B213F7E19D048276DAe",
//     "cumulativeGasUsed": 314159,
//     "gasUsed": 30234,
//     "events": {
//         "MyEvent": {
//             returnValues: {
//                 myIndexedParam: 20,
//                 myOtherIndexedParam: '0x123456789...',
//                 myNonIndexParam: 'My String'
//             },
//             raw: {
//                 data: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
//                 topics: ['0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7', '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385']
//             },
//             event: 'MyEvent',
//             signature: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
//             logIndex: 0,
//             transactionIndex: 0,
//             transactionHash: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
//             blockHash: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
//             blockNumber: 1234,
//             address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'
//         },
//         "MyOtherEvent": {
//             ...
//         },
//         "MyMultipleEvent":[{...}, {...}] // If there are multiple of the same event, they will be in an array
//     }
// }