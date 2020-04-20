const PHAToken = artifacts.require("PHAToken");

contract("PHA", accounts => {
  it("should put 1B PHA in the first account", async () => {
    const pha = await PHAToken.deployed()
    const balance = await pha.balanceOf.call(accounts[0]);
    assert.equal(
      balance.valueOf().toNumber(),
      10_0000_0000,
      "1B wasn't in the first account"
    );
  });

  // it("should call a function that depends on a linked library", () => {
  //   let meta;
  //   let PHABalance;
  //   let PHAEthBalance;

  //   return PHA.deployed()
  //     .then(instance => {
  //       meta = instance;
  //       return meta.getBalance.call(accounts[0]);
  //     })
  //     .then(outCoinBalance => {
  //       PHABalance = outCoinBalance.toNumber();
  //       return meta.getBalanceInEth.call(accounts[0]);
  //     })
  //     .then(outCoinBalanceEth => {
  //       PHAEthBalance = outCoinBalanceEth.toNumber();
  //     })
  //     .then(() => {
  //       assert.equal(
  //         PHAEthBalance,
  //         2 * PHABalance,
  //         "Library function returned unexpected function, linkage may be broken"
  //       );
  //     });
  // });

  // it("should send coin correctly", () => {
  //   let meta;

  //   // Get initial balances of first and second account.
  //   const account_one = accounts[0];
  //   const account_two = accounts[1];

  //   let account_one_starting_balance;
  //   let account_two_starting_balance;
  //   let account_one_ending_balance;
  //   let account_two_ending_balance;

  //   const amount = 10;

  //   return PHA.deployed()
  //     .then(instance => {
  //       meta = instance;
  //       return meta.getBalance.call(account_one);
  //     })
  //     .then(balance => {
  //       account_one_starting_balance = balance.toNumber();
  //       return meta.getBalance.call(account_two);
  //     })
  //     .then(balance => {
  //       account_two_starting_balance = balance.toNumber();
  //       return meta.sendCoin(account_two, amount, { from: account_one });
  //     })
  //     .then(() => meta.getBalance.call(account_one))
  //     .then(balance => {
  //       account_one_ending_balance = balance.toNumber();
  //       return meta.getBalance.call(account_two);
  //     })
  //     .then(balance => {
  //       account_two_ending_balance = balance.toNumber();

  //       assert.equal(
  //         account_one_ending_balance,
  //         account_one_starting_balance - amount,
  //         "Amount wasn't correctly taken from the sender"
  //       );
  //       assert.equal(
  //         account_two_ending_balance,
  //         account_two_starting_balance + amount,
  //         "Amount wasn't correctly sent to the receiver"
  //       );
  //     });
  // });
});