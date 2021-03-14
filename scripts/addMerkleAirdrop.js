// USAGE:
//  WORKDIR='./tmp/md1' DRYRUN=1 truffle exec ./scripts/addMerkleAirdrop.js --network development
//  WORKDIR='./tmp/md1' DRYRUN=1 truffle exec ./scripts/addMerkleAirdrop.js --network kovan
//  WORKDIR='./tmp/prod/md1' DRYRUN=1 truffle exec ./scripts/addMerkleAirdrop.js --network mainnet

require('dotenv').config()

const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const pinataSDK = require('@pinata/sdk');
const { merklize, toMaterializable } = require('@phala/merkledrop-lib');

const MerkleAirdrop = artifacts.require('MerkleAirdrop');
const PHAToken = artifacts.require('PHAToken');

const dryrun = parseInt(process.env.DRYRUN || '1');
const workdir = process.env.WORKDIR;
const pinataApi = process.env.PINATA_API;
const pinataKey = process.env.PINATA_KEY;
// const network = process.env.NETWORK || 'mainnet';

const csvFile = `${workdir}/inputs.csv`;
const outJson = `${workdir}/plan.json`;
const outManifest = `${workdir}/manifest.json`;

// const constants = {
//     mainnet: {
//         root: '0xb7687A5a3E7b49522705833Bf7D5bAf18AaBDD2d',
//         phaTokenAddress: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
//     },
//     kovan: {
//         root: '0xb7687A5a3E7b49522705833Bf7D5bAf18AaBDD2d',
//         phaTokenAddress: '0x6c5ba91642f10282b576d91922ae6448c9d52f4e',
//     }
// };
// const netConsts = constants[network];


function loadcsv (path) {
    const input = fs.readFileSync(path, 'utf-8');
    return parse(input, {
        columns: true,
        skip_empty_lines: true
    })
}

async function initPinata() {
    const pinata = pinataSDK(pinataApi, pinataKey);
    await pinata.testAuthentication();
    return pinata;
}

async function publishPlanToIpfs (pinata, path, name) {
    const { IpfsHash } = await pinata.pinFromFS(path, {
        pinataMetadata: {name},
    });
    return IpfsHash;
}

async function main () {
    console.log('Start with', {dryrun});

    const pinata = await initPinata();
    const drop = await MerkleAirdrop.deployed();
    const pha = await PHAToken.deployed();
    const [account] = await web3.eth.getAccounts();

    const curDrops = await drop.airdropsCount();
    console.log('Current airdrops:', curDrops.toNumber());

    // suppose to be: address,amount,xxx,yyy...
    let airdropData = loadcsv(csvFile);

    // check csv columns
    airdropData = airdropData
        .map(r => {return {...r, amount: parseFloat(r.amount)}})
        .filter(r => r.address && r.amount);
    if (airdropData.length == 0) {
        console.error('Empty csv file or missing columns');
        return;
    }
    console.log(airdropData);

    // create merkle tree
    const merklized = merklize(airdropData, 'address', 'amount');
    const plan = toMaterializable(merklized);
    plan.id = curDrops.toNumber() + 1;

    // materilize airdrop plan
    const planJson = JSON.stringify(plan);
    fs.writeFileSync(outJson, planJson, {encoding: 'utf-8'});

    // publish the plan to IPFS
    console.log('Publishing to IPFS...');
    const contractAddrPrefix = drop.address.substring(2, 8);
    const hash = await publishPlanToIpfs(pinata, outJson, `merkle-airdrop-${contractAddrPrefix}-${plan.id}`);

    // save manifest
    const manifest = {
        id: plan.id,
        ipfsHash: hash,
        timestamp: (new Date()).getTime(),
    };
    const manifestJson = JSON.stringify(manifest);
    fs.writeFileSync(outManifest, manifestJson, {encoding: 'utf-8'});

    // !!!
    const total = merklized.awards.map(a => parseFloat(a.amount)).reduce((a, x) => a + x, 0);
    console.log('About to add merkle airdrop', {
        root: merklized.root,
        size: merklized.awards.length,
        total,
        manifest
    });

    const remainingAllowance = await pha.allowance(account, drop.address);
    const remaining = parseFloat(web3.utils.fromWei(remainingAllowance));
    if (remaining <= total) {
        console.error(`Insufficient allowance (${remaining} <= ${total}). Exiting...`);
        return;
    }
    if (remaining * 0.8 <= total) {
        console.warn('Require > 80% of the allowance', {remaining, required: total});
    } else {
        console.info('Sufficient allowance', {remaining, required: total});
    }

    if (dryrun) {
        console.log('Dryrun enabled. Exiting...');
        return;
    }

    const uri = '/ipfs/' + hash;
    console.log('Adding airdrop', {root: merklized.root, uri});
    const r = await drop.start(merklized.root, uri, {gas: 150000, gasPrice: 125 * 1e9, nonce: undefined});
    console.log('Done', r);
}


module.exports = async function(callback) {
    try {
        await main();
        callback();
    } catch (err) {
        console.error(err.message);
        callback(err);
    }
}