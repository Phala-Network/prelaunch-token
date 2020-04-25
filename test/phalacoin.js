const truffleAssert = require('truffle-assertions');

const PHAToken = artifacts.require('PHAToken');
const BN = web3.utils.BN;

const UNIT = new BN('1000000000000000000');
const SUPPLY = UNIT.mul(new BN('1000000000'));

contract('PHA', accounts => {
  let pha;

  before(async () => {
    pha = await PHAToken.deployed();
  })

  it('should be paused when initialized', async () => {
    assert(await pha.paused(), 'Not paused');
  })

  it('should put 1B PHA in the first account', async () => {
    await pha.unpause();
    const balance = await pha.balanceOf(accounts[0]);
    assert(balance.eq(SUPPLY), '1B wasn\'t in the first account');
  });

  it('should send 1 PHA to accounts[1]', async () => {
    console.log(await pha.paused());
    await pha.transfer(accounts[1], UNIT);
    const balance = await pha.balanceOf(accounts[0]);
    assert(balance.eq(SUPPLY.sub(UNIT)), 'Bad balance');
  });

  it('should disallow non-owner transfer when pausing', async () => {
    // Can't transfer when paused
    await pha.pause();
    assert.equal(await pha.paused(), true, 'Should be paused');
    await truffleAssert.reverts(pha.transfer(accounts[1], UNIT), 'Pausable: paused');
    await pha.unpause();
    // Can transfer when unpaused
    const balanceBefore = await pha.balanceOf(accounts[0]);
    await pha.transfer(accounts[1], UNIT);
    const balanceAfter = await pha.balanceOf(accounts[0]);
    assert(balanceBefore.sub(UNIT).eq(balanceAfter), 'Balance should change');
  });

  it('should allow the owner to transfer when puased', async () => {
    await pha.pause();
    const balanceBefore = await pha.balanceOf(accounts[0]);
    await pha.ownerTransfer(accounts[1], UNIT);
    const balanceAfter = await pha.balanceOf(accounts[0]);
    assert(balanceBefore.sub(UNIT).eq(balanceAfter), 'Balance should change');
    await pha.unpause();
  });

  it('should reject non-owner\'s call to ownerTransfer', async () => {
    await truffleAssert.reverts(
      pha.ownerTransfer(accounts[0], UNIT, {from: accounts[1]}),
      'Ownable: caller is not the owner.'
    );
  });

});
