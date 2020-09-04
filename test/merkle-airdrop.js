const truffleAssert = require('truffle-assertions');

const MerkleAirdrop = artifacts.require('MerkleAirdrop');
const PHAToken = artifacts.require('PHAToken');
const BN = web3.utils.BN;

const {combineProofs, merklize} = require('@phala/merkledrop-lib');

const bn1e18 = new BN('1000000000000000000');

contract('MerkleAirdrop', accounts => {
    let drop;
    let pha;
    let testSetup;
    const root = accounts[0];
    const testData = [
        { address: accounts[1], amount: 123.4567 },
        { address: accounts[2], amount: 0.001 },
        { address: accounts[3], amount: 2.001 },
    ];
  
    before(async () => {
        drop = await MerkleAirdrop.deployed();
        pha = await PHAToken.deployed();
        // prepare
        await drop.setToken(pha.address, root);
        await pha.approve(drop.address, bn1e18.muln(99999));
        // add merkle airdrop
        testSetup = merklize(testData, 'address', 'amount');
        await drop.start(testSetup.root, 'mock-data-uri');
    });

    it('should have enough PHA allowance', async () => {
        const bn0 = new BN(0);
        const [balance, allowance] = await Promise.all([
            pha.balanceOf(root),
            pha.allowance(root, drop.address)]);
        assert(balance.gt(bn0));
        assert(allowance.gt(bn0));
    });

    it('should have one airdrop', async () => {
        assert(await drop.airdropsCount() == 1);
    });

    it('allows users to claim airdrop', async () => {
        for (let i = 0; i < testData.length; i++) {
            const award = testSetup.awards[i];
            const address = accounts[i+1];
            await drop.award(1, address, award.amountBN.toString(), award.proof);
            const received = await pha.balanceOf(address);
            assert(received.toString() == award.amountBN.toString());
        }
    });

    it('allows a user to claim multiple airdrops', async () => {
        const testData1 = [{ address: accounts[4], amount: 1 }, { address: accounts[5], amount: 1 }];
        const testData2 = [{ address: accounts[4], amount: 1 }, { address: accounts[5], amount: 1 }];

        const setup1 = merklize(testData1, 'address', 'amount');
        const setup2 = merklize(testData2, 'address', 'amount');

        const id1 = (await drop.airdropsCount()).toNumber() + 1;
        const id2 = id1 + 1;

        await drop.start(setup1.root, 'mock-data-uri');
        await drop.start(setup2.root, 'mock-data-uri');

        const curAirdropId = await drop.airdropsCount();
        assert(curAirdropId.eq(new BN(id2)), 'Airdrop count mismatch');

        const { combinedProof, proofLengths } = combineProofs([setup1.awards[0].proof, setup2.awards[0].proof]);
        await drop.awardFromMany(
            [id1, id2], accounts[4],
            [setup1.awards[0].amountBN.toString(), setup2.awards[0].amountBN.toString()],
            combinedProof, proofLengths
        );

        const balanceBN = await pha.balanceOf(accounts[4]);
        assert(balanceBN.eq(bn1e18.muln(2)), 'Wrong amount from airdrop');
    });

});
