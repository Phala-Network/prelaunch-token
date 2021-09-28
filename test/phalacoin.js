const truffleAssert = require('truffle-assertions');

const PHAToken = artifacts.require('Token');
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
    await pha.transfer(accounts[1], UNIT);
    const balance = await pha.balanceOf(accounts[0]);
    assert(balance.eq(SUPPLY.sub(UNIT)), 'Bad balance');
  });

  it('should disallow non-owner transfer when pausing', async () => {
    // Can't transfer when paused
    await pha.pause();
    assert.equal(await pha.paused(), true, 'Should be paused');
    await truffleAssert.reverts(
      pha.transfer(accounts[1], UNIT, {from: accounts[1]}),
      'Pausable: paused');
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
    await pha.transfer(accounts[1], UNIT);
    const balanceAfter = await pha.balanceOf(accounts[0]);
    assert(balanceBefore.sub(UNIT).eq(balanceAfter), 'Balance should change');
    await pha.unpause();
  });

  it('should reject non-owner\'s call to transferOwnership', async () => {
    await truffleAssert.reverts(
      pha.transferOwnership(accounts[2], {from: accounts[1]}),
      'Ownable: caller is not the owner.'
    );
  });

  it('should allow 3rd party to transfer from the owner with allowance', async () => {
    await pha.transfer(accounts[1], UNIT.muln(100));
    await pha.pause();
    await pha.approve(accounts[2], UNIT);
    const balanceBefore = await pha.balanceOf(accounts[0]);
    await pha.transferFrom(accounts[0], accounts[1], UNIT, {from: accounts[2]});
    const balanceAfter = await pha.balanceOf(accounts[0]);
    assert(balanceBefore.sub(UNIT).eq(balanceAfter), 'Balance should change');
    await pha.unpause();
  });

  it('should reject tranfer from any non-owner accounts when paused', async () => {
    await pha.transfer(accounts[1], UNIT.muln(100));
    await pha.approve(accounts[2], UNIT, {from: accounts[1]});
    await pha.pause();
    await truffleAssert.reverts(
      pha.transferFrom(accounts[1], accounts[2], UNIT, {from: accounts[2]}),
      'Pausable: paused');
    await pha.unpause();
  });

});
